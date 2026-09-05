/**
 * ARCHIVED — full Admin feature set. Not routed.
 * See src/preserved/README.md. Restore by copying over the live path.
 */
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { SESSION_CAPACITY, SESSIONS, type SessionId } from '../data/sessions'
import { lockAdmin } from '../lib/adminAuth'
import { copyText, emailBody, emailSubject, mailtoHref } from '../lib/inviteMail'
import {
  activeConfirmed,
  addInvited,
  exportInsuranceList,
  exportRosterText,
  hydrateFromRsvpLog,
  importRosterLines,
  loadRoster,
  markReplacementSent,
  needsReplacement,
  removeGuest,
  restoreGuest,
  upsertConfirmed,
  type RosterGuest,
} from '../lib/roster'
import { inviteUrl, staffSessionLabel, type Guest } from '../lib/opsStore'

function asGuest(row: RosterGuest): Guest {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    level: SESSIONS[row.sessionId].level,
    sessionId: row.sessionId,
    kind: 'wave1',
    status: row.status === 'confirmed' ? 'confirmed' : 'sent',
  }
}

export function Admin() {
  const [tick, setTick] = useState(0)
  const guests = useMemo(() => loadRoster(), [tick])
  const [flash, setFlash] = useState('')
  const [filter, setFilter] = useState<SessionId | 'all'>('all')
  const [addName, setAddName] = useState('')
  const [addEmail, setAddEmail] = useState('')
  const [addSession, setAddSession] = useState<SessionId>('sat-7am')
  const [paste, setPaste] = useState('')

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

  const visible = guests.filter((g) => {
    if (g.status === 'removed' || g.status === 'cancelled') return false
    if (filter === 'all') return true
    return g.sessionId === filter
  })

  async function copyLink(row: RosterGuest) {
    const ok = await copyText(inviteUrl(row.sessionId, row.name))
    say(ok ? `Copied link for ${row.name}` : 'Copy failed')
  }

  function mailInvite(row: RosterGuest) {
    if (!row.email) {
      say('Add an email first')
      return
    }
    window.location.href = mailtoHref(asGuest(row))
  }

  async function copyEmail(row: RosterGuest) {
    if (!row.email) {
      say('Add an email first')
      return
    }
    const ok = await copyText(`To: ${row.email}\nSubject: ${emailSubject()}\n\n${emailBody(asGuest(row))}`)
    say(ok ? 'Copied email' : 'Copy failed')
  }

  function onInvite(e: FormEvent) {
    e.preventDefault()
    const name = addName.trim()
    if (!name) {
      say('Add a name')
      return
    }
    const row = addInvited(name, addEmail.trim(), addSession)
    setAddName('')
    setAddEmail('')
    refresh()
    say(`Invite ready for ${row.name}`)
  }

  function onConfirmAdd() {
    const name = addName.trim()
    if (!name) {
      say('Add a name')
      return
    }
    upsertConfirmed(name, addSession, null, addEmail.trim())
    setAddName('')
    setAddEmail('')
    refresh()
    say(`Added ${name} as confirmed`)
  }

  function onHydrate() {
    const n = hydrateFromRsvpLog()
    refresh()
    say(n ? `Synced ${n} from this phone’s log` : 'No new RSVPs on this phone')
  }

  async function onExportCsv() {
    const ok = await copyText(exportRosterText(loadRoster()))
    say(ok ? 'CSV-style list copied' : 'Copy failed')
  }

  async function onInsuranceCopy() {
    const text = exportInsuranceList(loadRoster())
    const ok = await copyText(text || 'No confirmed players yet.')
    say(ok ? 'Insurance list copied' : 'Copy failed')
  }

  function onImport(e: FormEvent) {
    e.preventDefault()
    const n = importRosterLines(paste)
    setPaste('')
    refresh()
    say(n ? `Imported ${n}` : 'Nothing to import — Name, Email, sat-7am')
  }

  return (
    <div className="stage">
      <div className="invite louise">
        <div className="louise-page ops-page">
          <p className="eyebrow">Louise &amp; Alan · who’s coming</p>
          <h1 className="louise-title">Admin</h1>
          <p className="louise-lead">
            One tap from your home screen. Lists are by session. RSVPs also email{' '}
            <strong>play@</strong> — paste from that inbox if someone confirmed on another phone.
          </p>

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

          <div className="ops-capacity">
            {(Object.keys(SESSIONS) as SessionId[]).map((id) => (
              <div key={id} className="ops-cap-pill">
                <strong>{staffSessionLabel(id)}</strong>
                <span>
                  {activeConfirmed(guests, id)}/{SESSION_CAPACITY}
                </span>
              </div>
            ))}
          </div>

          <div className="louise-toolbar">
            <button type="button" className="btn btn-primary" onClick={() => void onInsuranceCopy()}>
              Copy list (insurance)
            </button>
            <button type="button" className="btn btn-dark" onClick={onHydrate}>
              Pull from this phone
            </button>
            <button type="button" className="btn btn-dark" onClick={() => void onExportCsv()}>
              Copy CSV
            </button>
            <Link className="btn btn-dark" to="/ops">
              Full console
            </Link>
            <button
              type="button"
              className="btn"
              onClick={() => {
                lockAdmin()
                window.location.reload()
              }}
            >
              Log out
            </button>
          </div>

          <div className="louise-toolbar" style={{ marginTop: 12 }}>
            {(Object.keys(SESSIONS) as SessionId[]).map((id) => (
              <button
                key={id}
                type="button"
                className={filter === id ? 'btn btn-primary' : 'btn btn-dark'}
                onClick={() => setFilter(id)}
              >
                {staffSessionLabel(id)}
              </button>
            ))}
            <button
              type="button"
              className={filter === 'all' ? 'btn btn-primary' : 'btn btn-dark'}
              onClick={() => setFilter('all')}
            >
              All
            </button>
          </div>

          {(Object.keys(SESSIONS) as SessionId[])
            .filter((id) => filter === 'all' || filter === id)
            .map((id) => {
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

          <section className="ops-card" style={{ marginTop: 16 }}>
            <h2>Invite or add</h2>
            <form className="form" onSubmit={onInvite}>
              <label className="field">
                Name
                <input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="Full name" />
              </label>
              <label className="field">
                Email
                <input
                  type="email"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  placeholder="optional for add · needed to email"
                />
              </label>
              <label className="field">
                Session
                <select
                  className="admin-select"
                  value={addSession}
                  onChange={(e) => setAddSession(e.target.value as SessionId)}
                >
                  {(Object.keys(SESSIONS) as SessionId[]).map((id) => (
                    <option key={id} value={id}>
                      {staffSessionLabel(id)}
                    </option>
                  ))}
                </select>
              </label>
              <button className="btn btn-primary btn-block" type="submit">
                Save invite &amp; use buttons below
              </button>
              <button className="btn btn-dark btn-block" type="button" onClick={onConfirmAdd}>
                Mark as already confirmed
              </button>
            </form>
            {visible.some((g) => g.status === 'invited') ? (
              <ul className="admin-list" style={{ marginTop: 12 }}>
                {visible
                  .filter((g) => g.status === 'invited')
                  .map((g) => (
                    <li key={g.id} className="admin-row">
                      <div>
                        <strong>{g.name}</strong>
                        <span>
                          {staffSessionLabel(g.sessionId)} · invited
                          {g.email ? ` · ${g.email}` : ''}
                        </span>
                      </div>
                      <div className="admin-row-actions">
                        <button type="button" onClick={() => void copyLink(g)}>
                          Copy link
                        </button>
                        <button type="button" onClick={() => mailInvite(g)}>
                          Email
                        </button>
                        <button type="button" onClick={() => void copyEmail(g)}>
                          Copy email
                        </button>
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
            ) : null}
          </section>

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

          <section className="ops-card" style={{ marginTop: 12 }}>
            <h2>Paste from play@ or another phone</h2>
            <p className="form-note">One per line: Name, Email, sat-7am (or sat-6pm / sun-7am)</p>
            <form className="form" onSubmit={onImport}>
              <textarea
                className="louise-textarea"
                rows={4}
                value={paste}
                onChange={(e) => setPaste(e.target.value)}
                placeholder={'Jane Smith, jane@email.com, sat-7am'}
              />
              <button className="btn btn-dark btn-block" type="submit">
                Import into this list
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  )
}
