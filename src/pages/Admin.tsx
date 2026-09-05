/** Full feature snapshot: src/preserved/Admin.full.tsx (and README there). */
import { useEffect, useMemo, useState } from 'react'
import { SESSION_CAPACITY, SESSIONS, type SessionId } from '../data/sessions'
import {
  loadRoster,
  markReplacementSent,
  needsReplacement,
  removeGuest,
  restoreGuest,
} from '../lib/roster'
import { staffSessionLabel } from '../lib/opsStore'

export function Admin() {
  const [tick, setTick] = useState(0)
  const guests = useMemo(() => loadRoster(), [tick])
  const [flash, setFlash] = useState('')

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

  return (
    <div className="stage">
      <div className="invite louise">
        <div className="louise-page ops-page">
          <p className="eyebrow">Louise &amp; Alan · who’s coming</p>
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
            return (
              <section key={id} className="ops-card" style={{ marginTop: 12 }}>
                <h2>
                  {staffSessionLabel(id)}{' '}
                  <span style={{ fontWeight: 500, opacity: 0.7 }}>
                    {rows.length}/{SESSION_CAPACITY}
                  </span>
                </h2>
                {rows.length === 0 ? (
                  <p className="form-note">Nobody confirmed yet.</p>
                ) : (
                  <ul className="admin-list">
                    {rows.map((g) => (
                      <li key={g.id} className="admin-row">
                        <div>
                          <strong>
                            {g.place ? `${g.place}. ` : ''}
                            {g.name}
                          </strong>
                          <span>{g.email ? g.email : 'in'}</span>
                        </div>
                        <div className="admin-row-actions">
                          <button
                            type="button"
                            onClick={() => {
                              removeGuest(g.id)
                              refresh()
                              say(`Removed ${g.name}`)
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
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
