import { useMemo, useState } from 'react'
import { SESSIONS, type SessionId } from '../data/sessions'
import {
  copyText,
  downloadText,
  emailBody,
  mailMergeCsv,
  mailtoHref,
} from '../lib/inviteMail'
import { readRsvpLog, setOpsWebhook } from '../lib/opsNotify'
import {
  SESSION_CAPACITY,
  inviteUrl,
  loadOps,
  mergeGuests,
  parseGuestLines,
  saveOps,
  staffSessionLabel,
  wave2Needs,
  type Guest,
  type GuestStatus,
  type OpsState,
} from '../lib/opsStore'

function useOpsState() {
  const [state, setState] = useState<OpsState>(() => {
    const s = loadOps()
    setOpsWebhook(s.rsvpWebhook)
    return s
  })

  function update(next: OpsState) {
    saveOps(next)
    setOpsWebhook(next.rsvpWebhook)
    setState(next)
  }

  return [state, update] as const
}

export function Ops() {
  const [state, setState] = useOpsState()
  const [wavePaste, setWavePaste] = useState('')
  const [benchPaste, setBenchPaste] = useState('')
  const [importMsg, setImportMsg] = useState('')
  const [flash, setFlash] = useState('')
  const [filterSession, setFilterSession] = useState<SessionId | 'all'>('all')

  const wave1 = state.guests.filter((g) => g.kind === 'wave1')
  const bench = state.guests.filter((g) => g.kind === 'bench')

  const visible = useMemo(() => {
    if (filterSession === 'all') return state.guests
    return state.guests.filter((g) => g.sessionId === filterSession)
  }, [state.guests, filterSession])

  const needs = wave2Needs(state.guests)
  const rsvpLog = readRsvpLog()

  function flashMsg(msg: string) {
    setFlash(msg)
    window.setTimeout(() => setFlash(''), 2000)
  }

  function importWave() {
    const incoming = parseGuestLines(wavePaste, 'wave1')
    if (!incoming.length) {
      setImportMsg('Couldn’t parse — use: Name, Email, Level (beginner / intermediate / advanced)')
      return
    }
    const guests = mergeGuests(state.guests, incoming)
    setState({ ...state, guests })
    setWavePaste('')
    setImportMsg(`Imported ${incoming.length} for Wave 1`)
  }

  function importBench() {
    const incoming = parseGuestLines(benchPaste, 'bench')
    if (!incoming.length) {
      setImportMsg('Bench parse failed — same format: Name, Email, Level')
      return
    }
    const guests = mergeGuests(state.guests, incoming)
    setState({ ...state, guests })
    setBenchPaste('')
    setImportMsg(`Imported ${incoming.length} to bench`)
  }

  function setStatus(id: string, status: GuestStatus) {
    const guests = state.guests.map((g) => {
      if (g.id !== id) return g
      const next: Guest = { ...g, status }
      if (status === 'sent') next.sentAt = new Date().toISOString()
      if (status === 'confirmed') next.confirmedAt = new Date().toISOString()
      return next
    })
    setState({ ...state, guests })
  }

  function promoteFromBench(sessionId: SessionId, count: number) {
    const available = state.guests.filter(
      (g) => g.kind === 'bench' && g.sessionId === sessionId && g.status === 'draft',
    )
    const take = available.slice(0, count)
    if (!take.length) {
      flashMsg('No bench people for that session')
      return
    }
    const ids = new Set(take.map((t) => t.id))
    const guests = state.guests.map((g) =>
      ids.has(g.id) ? { ...g, kind: 'wave1' as const, status: 'draft' as const } : g,
    )
    setState({ ...state, guests })
    flashMsg(`Moved ${take.length} from bench → Wave 1 (${staffSessionLabel(sessionId)})`)
  }

  function syncFromRsvpLog() {
    let guests = [...state.guests]
    let hits = 0
    for (const entry of rsvpLog) {
      if (entry.type !== 'rsvp') continue
      const name = entry.name.trim().toLowerCase()
      const session = entry.session as SessionId
      const hasSession = Boolean(session && SESSIONS[session])
      guests = guests.map((g) => {
        if (g.name.toLowerCase() !== name) return g
        if (hasSession && g.sessionId !== session) return g
        if (g.status === 'confirmed') return g
        hits += 1
        return { ...g, status: 'confirmed' as const, confirmedAt: entry.at }
      })
    }
    setState({ ...state, guests })
    flashMsg(hits ? `Matched ${hits} RSVP(s) from log` : 'No new RSVP matches')
  }

  async function sendMailto(guest: Guest) {
    window.location.href = mailtoHref(guest)
    setStatus(guest.id, 'sent')
  }

  async function copyGuestEmail(guest: Guest) {
    const ok = await copyText(`To: ${guest.email}\nSubject: Private invitation\n\n${emailBody(guest)}`)
    flashMsg(ok ? `Copied email for ${guest.name}` : 'Copy failed')
  }

  function downloadMerge() {
    const list = state.guests.filter((g) => g.kind === 'wave1' || g.status === 'draft' || g.status === 'sent')
    const targets = list.filter((g) => g.status !== 'declined')
    downloadText('hive-invites-mail-merge.csv', mailMergeCsv(targets))
    flashMsg('CSV downloaded — open in Gmail mail merge / YAMM, send as play@')
  }

  const confirmedCounts = {
    'sat-7am': state.guests.filter((g) => g.sessionId === 'sat-7am' && g.status === 'confirmed').length,
    'sat-6pm': state.guests.filter((g) => g.sessionId === 'sat-6pm' && g.status === 'confirmed').length,
    'sun-7am': state.guests.filter((g) => g.sessionId === 'sun-7am' && g.status === 'confirmed').length,
  }

  return (
    <div className="stage">
      <div className="invite louise">
        <div className="louise-page ops-page">
          <p className="eyebrow">Operator console · you, not Louise</p>
          <h1 className="louise-title">Hive invites</h1>
          <p className="louise-lead">
            Louise’s only job: send you <strong>Name, Email, Level</strong>. You import, send as the
            Hive, watch RSVPs, and pull from the bench if a session is short.
          </p>

          {flash ? <p className="ops-flash">{flash}</p> : null}
          {importMsg ? <p className="form-note">{importMsg}</p> : null}

          <div className="louise-waves">
            <strong>Tell Louise</strong>
            <p>
              “Send me Name, Email, and Beginner / Intermediate / Advanced. I’ll send the invites as
              the Hive. You don’t copy links or chase RSVPs.”
            </p>
            <p style={{ marginTop: 8 }}>
              Optional: a second list of “bench” people if we need to fill spots.
            </p>
          </div>

          <div className="ops-grid">
            <section className="ops-card">
              <h2>1 · Import Wave 1</h2>
              <p className="form-note">One person per line: Name, Email, Level</p>
              <textarea
                className="louise-textarea"
                rows={6}
                value={wavePaste}
                onChange={(e) => setWavePaste(e.target.value)}
                placeholder={'Jane Smith, jane@email.com, beginner\nSam Lee, sam@email.com, intermediate'}
              />
              <button type="button" className="btn btn-primary btn-block" onClick={importWave}>
                Import Wave 1
              </button>
            </section>

            <section className="ops-card">
              <h2>Bench (wave 2)</h2>
              <p className="form-note">Same format — only used if a session is under {SESSION_CAPACITY}</p>
              <textarea
                className="louise-textarea"
                rows={6}
                value={benchPaste}
                onChange={(e) => setBenchPaste(e.target.value)}
                placeholder={'Alex Nguyen, alex@email.com, advanced'}
              />
              <button type="button" className="btn btn-dark btn-block" onClick={importBench}>
                Import bench
              </button>
            </section>
          </div>

          <section className="ops-card" style={{ marginTop: 16 }}>
            <h2>2 · Send as the Hive</h2>
            <p className="form-note">
              Opens mail as whoever is logged into the mail app — use <strong>play@thepickleballhive.au</strong>{' '}
              (or Louise’s account). Or download CSV for Gmail mail merge / Yet Another Mail Merge.
            </p>
            <div className="louise-toolbar">
              <button type="button" className="btn btn-primary" onClick={downloadMerge}>
                Download mail-merge CSV
              </button>
              <button
                type="button"
                className="btn btn-dark"
                onClick={async () => {
                  const lines = wave1
                    .filter((g) => g.status !== 'declined')
                    .map((g) => `${g.name} <${g.email}> — ${inviteUrl(g.sessionId, g.name)}`)
                    .join('\n')
                  flashMsg((await copyText(lines)) ? 'Copied all links' : 'Copy failed')
                }}
              >
                Copy all links
              </button>
            </div>
          </section>

          <section className="ops-card" style={{ marginTop: 16 }}>
            <h2>3 · Status board</h2>
            <div className="ops-capacity">
              {(Object.keys(SESSIONS) as SessionId[]).map((id) => (
                <div key={id} className="ops-cap-pill">
                  <strong>{staffSessionLabel(id)}</strong>
                  <span>
                    {confirmedCounts[id]}/{SESSION_CAPACITY} confirmed
                  </span>
                </div>
              ))}
            </div>

            {needs.length ? (
              <div className="ops-wave2">
                <strong>Wave 2 needed</strong>
                <ul>
                  {needs.map((n) => (
                    <li key={n.sessionId}>
                      {staffSessionLabel(n.sessionId)} — need {n.need} more
                      <button
                        type="button"
                        className="btn btn-dark louise-copy"
                        style={{ marginLeft: 8, width: 'auto', display: 'inline-flex' }}
                        onClick={() => promoteFromBench(n.sessionId, n.need)}
                      >
                        Pull {n.need} from bench
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="form-note">All sessions at capacity (or empty — import people first).</p>
            )}

            <div className="louise-toolbar">
              <label className="ops-filter">
                Filter
                <select
                  className="louise-select"
                  value={filterSession}
                  onChange={(e) => setFilterSession(e.target.value as SessionId | 'all')}
                >
                  <option value="all">All sessions</option>
                  {(Object.keys(SESSIONS) as SessionId[]).map((id) => (
                    <option key={id} value={id}>
                      {staffSessionLabel(id)}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className="btn btn-dark" onClick={syncFromRsvpLog}>
                Sync from RSVP log
              </button>
            </div>

            <div className="ops-table-wrap">
              <table className="ops-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Session</th>
                    <th>Kind</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.length === 0 ? (
                    <tr>
                      <td colSpan={5}>No guests yet — paste Louise’s list above.</td>
                    </tr>
                  ) : (
                    visible.map((g) => (
                      <tr key={g.id}>
                        <td>
                          <strong>{g.name}</strong>
                          <div className="ops-email">{g.email}</div>
                          <a className="ops-link" href={inviteUrl(g.sessionId, g.name)} target="_blank" rel="noreferrer">
                            invite link
                          </a>
                        </td>
                        <td>{staffSessionLabel(g.sessionId)}</td>
                        <td>{g.kind}</td>
                        <td>
                          <select
                            className="louise-select ops-status"
                            value={g.status}
                            onChange={(e) => setStatus(g.id, e.target.value as GuestStatus)}
                          >
                            <option value="draft">draft</option>
                            <option value="sent">sent</option>
                            <option value="confirmed">confirmed</option>
                            <option value="declined">declined</option>
                          </select>
                        </td>
                        <td className="ops-actions">
                          <button type="button" className="btn btn-primary louise-copy" onClick={() => sendMailto(g)}>
                            Email
                          </button>
                          <button type="button" className="btn btn-dark louise-copy" onClick={() => copyGuestEmail(g)}>
                            Copy
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="ops-card" style={{ marginTop: 16 }}>
            <h2>Live RSVP webhook (optional)</h2>
            <p className="form-note">
              Point a Google Apps Script / Make.com webhook here. Guest RSVPs still email{' '}
              {state.rsvpWebhook ? '' : ''}
              play@ — and also POST JSON to this URL. Leave blank to rely on email + Sync from RSVP log
              (same browser as the guest, or mark status manually).
            </p>
            <label className="field">
              Webhook URL
              <input
                className="louise-select"
                type="url"
                value={state.rsvpWebhook}
                onChange={(e) => {
                  const rsvpWebhook = e.target.value
                  setState({ ...state, rsvpWebhook })
                  setOpsWebhook(rsvpWebhook)
                }}
                placeholder="https://script.google.com/macros/s/…/exec"
              />
            </label>
            {rsvpLog.length > 0 ? (
              <p className="form-note" style={{ marginTop: 12 }}>
                Local RSVP log: {rsvpLog.length} event(s). Latest: {rsvpLog[0]?.type} · {rsvpLog[0]?.name}
              </p>
            ) : null}
          </section>

          <p className="footer-mini" style={{ marginTop: 24 }}>
            Wave 1 people: {wave1.length} · Bench: {bench.length}
          </p>
        </div>
      </div>
    </div>
  )
}
