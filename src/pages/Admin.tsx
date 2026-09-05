/** Full feature snapshot: src/preserved/Admin.full.tsx (and README there). */
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { SESSION_CAPACITY, SESSIONS, type SessionId } from '../data/sessions'
import { releaseSeat } from '../lib/attendance'
import {
  loadRoster,
  markReplacementSent,
  needsReplacement,
  removeGuest,
  restoreGuest,
  upsertConfirmed,
} from '../lib/roster'
import { staffSessionLabel } from '../lib/opsStore'

export function Admin() {
  const [tick, setTick] = useState(0)
  const guests = useMemo(() => loadRoster(), [tick])
  const [flash, setFlash] = useState('')
  const [editing, setEditing] = useState<SessionId | null>(null)
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
  }

  async function onDelete(id: string, name: string, sessionId: SessionId) {
    if (!window.confirm(`Remove ${name} from this session?`)) return
    removeGuest(id)
    try {
      await releaseSeat(sessionId, name)
    } catch {
      /* roster still updated */
    }
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

                {rows.length === 0 ? (
                  <p className="form-note" style={{ marginTop: 12 }}>
                    Nobody confirmed yet.
                  </p>
                ) : (
                  <ul className="admin-list" style={{ marginTop: 12 }}>
                    {rows.map((g) => (
                      <li key={g.id} className="admin-row">
                        <div>
                          <strong>
                            {g.place ? `${g.place}. ` : ''}
                            {g.name}
                          </strong>
                          <span>{g.email ? g.email : 'in'}</span>
                        </div>
                        {isEditing ? (
                          <div className="admin-row-actions">
                            <button
                              type="button"
                              onClick={() => void onDelete(g.id, g.name, g.sessionId)}
                            >
                              Delete
                            </button>
                          </div>
                        ) : null}
                      </li>
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
