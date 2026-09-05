/** Full feature snapshot: src/preserved/Admin.full.tsx (and README there). */
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { SESSION_CAPACITY, SESSIONS, type SessionId } from '../data/sessions'
import { releaseSeat } from '../lib/attendance'
import {
  loadRoster,
  markReplacementSent,
  needsReplacement,
  removeGuest,
  restoreGuest,
  upsertConfirmed,
  type RosterGuest,
} from '../lib/roster'
import { staffSessionLabel } from '../lib/opsStore'

const DELETE_WIDTH = 88

function SwipeGuestRow({
  guest,
  canSwipe,
  open,
  onOpen,
  onClose,
  onDelete,
}: {
  guest: RosterGuest
  canSwipe: boolean
  open: boolean
  onOpen: () => void
  onClose: () => void
  onDelete: () => void
}) {
  const [dragX, setDragX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startX = useRef(0)
  const startY = useRef(0)
  const startOffset = useRef(0)
  const axis = useRef<'x' | 'y' | null>(null)
  const pointerId = useRef<number | null>(null)

  const offset = canSwipe ? (dragging ? dragX : open ? -DELETE_WIDTH : 0) : 0

  useEffect(() => {
    if (!canSwipe) {
      setDragX(0)
      setDragging(false)
    }
  }, [canSwipe])

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (!canSwipe) return
    pointerId.current = e.pointerId
    e.currentTarget.setPointerCapture(e.pointerId)
    startX.current = e.clientX
    startY.current = e.clientY
    startOffset.current = open ? -DELETE_WIDTH : 0
    axis.current = null
    setDragging(true)
    setDragX(startOffset.current)
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!canSwipe || !dragging || pointerId.current !== e.pointerId) return
    const dx = e.clientX - startX.current
    const dy = e.clientY - startY.current
    if (!axis.current) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
      axis.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
      if (axis.current === 'y') {
        setDragging(false)
        setDragX(0)
        return
      }
    }
    if (axis.current !== 'x') return
    const next = Math.min(0, Math.max(-DELETE_WIDTH, startOffset.current + dx))
    setDragX(next)
  }

  function endDrag(e: ReactPointerEvent<HTMLDivElement>) {
    if (!canSwipe || pointerId.current !== e.pointerId) return
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    pointerId.current = null
    if (!dragging) return
    const final = axis.current === 'x' ? dragX : startOffset.current
    setDragging(false)
    axis.current = null
    if (final <= -DELETE_WIDTH / 2) {
      onOpen()
      setDragX(-DELETE_WIDTH)
    } else {
      onClose()
      setDragX(0)
    }
  }

  return (
    <li className={`swipe-row${canSwipe ? ' swipe-row--live' : ''}`}>
      {canSwipe ? (
        <div className="swipe-actions" aria-hidden={offset > -DELETE_WIDTH / 3}>
          <button type="button" className="swipe-delete" onClick={onDelete}>
            Delete
          </button>
        </div>
      ) : null}
      <div
        className={`swipe-front${dragging ? ' is-dragging' : ''}`}
        style={{ transform: `translateX(${offset}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div className="swipe-front-inner">
          <strong>
            {guest.place ? `${guest.place}. ` : ''}
            {guest.name}
          </strong>
          <span>{guest.email ? guest.email : 'in'}</span>
        </div>
      </div>
    </li>
  )
}

export function Admin() {
  const [tick, setTick] = useState(0)
  const guests = useMemo(() => loadRoster(), [tick])
  const [flash, setFlash] = useState('')
  const [editing, setEditing] = useState<SessionId | null>(null)
  const [openSwipe, setOpenSwipe] = useState<string | null>(null)
  const [addName, setAddName] = useState('')
  const [addBusy, setAddBusy] = useState(false)

  const replacements = needsReplacement(guests)

  useEffect(() => {
    document.title =
      replacements.length > 0
        ? `(${replacements.length}) Hive Admin — need replacement`
        : 'Hive Admin'
    return () => {
      document.title = 'The Hive Product Test · Private Invitation'
    }
  }, [replacements.length])

  function refresh() {
    setTick((n) => n + 1)
  }

  function say(msg: string) {
    setFlash(msg)
    window.setTimeout(() => setFlash(''), 2200)
  }

  function toggleEdit(id: SessionId) {
    setEditing((cur) => (cur === id ? null : id))
    setAddName('')
    setOpenSwipe(null)
  }

  async function onDelete(id: string, name: string, sessionId: SessionId) {
    if (!window.confirm(`Remove ${name} from this session?`)) {
      setOpenSwipe(null)
      return
    }
    removeGuest(id)
    try {
      await releaseSeat(sessionId, name)
    } catch {
      /* roster still updated */
    }
    setOpenSwipe(null)
    refresh()
    say(`Removed ${name}`)
  }

  function onAdd(e: FormEvent, sessionId: SessionId) {
    e.preventDefault()
    const name = addName.trim()
    if (!name) {
      say('Add a name')
      return
    }
    const rows = guests.filter((g) => g.sessionId === sessionId && g.status === 'confirmed')
    if (rows.length >= SESSION_CAPACITY) {
      say('This session is already full (8)')
      return
    }
    setAddBusy(true)
    upsertConfirmed(name, sessionId, null)
    setAddName('')
    refresh()
    say(`Added ${name}`)
    setAddBusy(false)
  }

  return (
    <div className="stage">
      <div className="invite louise">
        <div className="louise-page ops-page">
          <h1 className="louise-title">Admin</h1>

          {flash ? <p className="ops-flash">{flash}</p> : null}

          {replacements.length > 0 ? (
            <section
              className="ops-card"
              style={{
                marginTop: 12,
                border: '2px solid #b42318',
                background: 'rgba(180, 35, 24, 0.08)',
              }}
            >
              <h2 style={{ color: '#b42318' }}>Need replacement · {replacements.length}</h2>
              <p className="form-note">
                These people can’t come. Send another invite from your SMS list, then tap Done.
              </p>
              <ul className="admin-list">
                {replacements.map((g) => (
                  <li key={g.id} className="admin-row">
                    <div>
                      <strong>{g.name}</strong>
                      <span>{staffSessionLabel(g.sessionId)} · cancelled</span>
                    </div>
                    <div className="admin-row-actions">
                      <button
                        type="button"
                        onClick={() => {
                          markReplacementSent(g.id)
                          refresh()
                          say(`Cleared ${g.name}`)
                        }}
                      >
                        Replacement sent
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {(Object.keys(SESSIONS) as SessionId[]).map((id) => {
            const rows = guests
              .filter((g) => g.sessionId === id && g.status === 'confirmed')
              .sort((a, b) => (a.place ?? 99) - (b.place ?? 99))
            const isEditing = editing === id
            return (
              <section key={id} className="ops-card" style={{ marginTop: 12 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    flexWrap: 'wrap',
                  }}
                >
                  <h2 style={{ margin: 0 }}>
                    {staffSessionLabel(id)}{' '}
                    <span style={{ fontWeight: 500, opacity: 0.7 }}>
                      {rows.length}/{SESSION_CAPACITY}
                    </span>
                  </h2>
                  <button
                    type="button"
                    className={isEditing ? 'btn btn-primary' : 'btn btn-dark'}
                    onClick={() => toggleEdit(id)}
                  >
                    {isEditing ? 'Done' : 'Edit'}
                  </button>
                </div>

                {isEditing && rows.length > 0 ? (
                  <p className="form-note" style={{ marginTop: 10 }}>
                    Swipe a name left to delete
                  </p>
                ) : null}

                {rows.length === 0 ? (
                  <p className="form-note" style={{ marginTop: 12 }}>
                    Nobody confirmed yet.
                  </p>
                ) : (
                  <ul className="admin-list swipe-list" style={{ marginTop: 12 }}>
                    {rows.map((g) => (
                      <SwipeGuestRow
                        key={g.id}
                        guest={g}
                        canSwipe={isEditing}
                        open={openSwipe === g.id}
                        onOpen={() => setOpenSwipe(g.id)}
                        onClose={() => setOpenSwipe((cur) => (cur === g.id ? null : cur))}
                        onDelete={() => void onDelete(g.id, g.name, g.sessionId)}
                      />
                    ))}
                  </ul>
                )}

                {isEditing ? (
                  <form className="form" style={{ marginTop: 14 }} onSubmit={(e) => onAdd(e, id)}>
                    <label className="field">
                      Add someone
                      <input
                        value={addName}
                        onChange={(e) => setAddName(e.target.value)}
                        placeholder="Full name"
                        autoComplete="name"
                      />
                    </label>
                    <button
                      className="btn btn-primary btn-block"
                      type="submit"
                      disabled={addBusy || rows.length >= SESSION_CAPACITY}
                    >
                      {rows.length >= SESSION_CAPACITY ? 'Session full' : 'Add to list'}
                    </button>
                  </form>
                ) : null}
              </section>
            )
          })}

          {guests.some((g) => g.status === 'removed') ? (
            <section className="ops-card" style={{ marginTop: 12 }}>
              <h2>Removed</h2>
              <ul className="admin-list">
                {guests
                  .filter((g) => g.status === 'removed')
                  .map((g) => (
                    <li key={g.id} className="admin-row">
                      <div>
                        <strong>{g.name}</strong>
                        <span>{staffSessionLabel(g.sessionId)} · out</span>
                      </div>
                      <div className="admin-row-actions">
                        <button
                          type="button"
                          onClick={() => {
                            restoreGuest(g.id)
                            refresh()
                            say(`Restored ${g.name}`)
                          }}
                        >
                          Restore
                        </button>
                      </div>
                    </li>
                  ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  )
}
