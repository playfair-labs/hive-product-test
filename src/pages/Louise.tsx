import { useMemo, useState } from 'react'
import { SESSIONS, type SessionId } from '../data/sessions'

/** Always generate live guest links Louise can paste into email */
const PUBLIC_BASE = 'https://playfair-labs.github.io/hive-product-test'

function parseNames(raw: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const line of raw.split(/\r?\n/)) {
    const name = line.trim()
    if (!name) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(name)
  }
  return out
}

function inviteUrl(sessionId: SessionId, name: string): string {
  return `${PUBLIC_BASE}/${sessionId}?name=${encodeURIComponent(name)}`
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function Louise() {
  const [sessionId, setSessionId] = useState<SessionId>('9am')
  const [raw, setRaw] = useState('')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const names = useMemo(() => parseNames(raw), [raw])
  const session = SESSIONS[sessionId]

  const rows = useMemo(
    () => names.map((name) => ({ name, url: inviteUrl(sessionId, name) })),
    [names, sessionId],
  )

  const allLines = rows.map((r) => `${r.name} — ${r.url}`).join('\n')

  async function markCopied(key: string, text: string) {
    const ok = await copyText(text)
    if (ok) {
      setCopiedKey(key)
      window.setTimeout(() => setCopiedKey((cur) => (cur === key ? null : cur)), 1600)
    }
  }

  return (
    <div className="stage">
      <div className="invite louise">
        <div className="louise-page">
          <p className="eyebrow">Hive team only</p>
          <h1 className="louise-title">Invite link maker</h1>
          <p className="louise-lead">
            Paste names (one per line), pick the session time, then copy personal links for email.
            Guests only see their time — not other sessions.
          </p>

          <div className="louise-waves">
            <strong>Wave process</strong>
            <ol>
              <li>Wave 1 — invite ~10 hand-picked people per session</li>
              <li>Wait for RSVPs in play@thepickleballhive.au</li>
              <li>Wave 2 — if under 8, send the next hand-picked people</li>
            </ol>
            <p>No public “places left” counter — you fill quietly so nobody feels they missed out.</p>
          </div>

          <label className="field">
            Session
            <select
              className="louise-select"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value as SessionId)}
            >
              {(Object.keys(SESSIONS) as SessionId[]).map((id) => (
                <option key={id} value={id}>
                  {SESSIONS[id].timeLabel} ({id})
                </option>
              ))}
            </select>
          </label>

          <p className="form-note" style={{ marginTop: 8 }}>
            Guests will see: <strong>{session.timeLabel}</strong> · 2 hours
          </p>

          <label className="field" style={{ marginTop: 16 }}>
            Names (one per line)
            <textarea
              className="louise-textarea"
              rows={10}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder={'Jane Smith\nSam Lee\nAlex Nguyen'}
            />
          </label>

          {rows.length > 0 ? (
            <>
              <div className="louise-toolbar">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => markCopied('all', allLines)}
                >
                  {copiedKey === 'all' ? 'Copied all' : 'Copy all as email lines'}
                </button>
                <span className="form-note">{rows.length} link{rows.length === 1 ? '' : 's'}</span>
              </div>

              <ul className="louise-list">
                {rows.map((row) => (
                  <li key={row.name}>
                    <div className="louise-row-text">
                      <strong>{row.name}</strong>
                      <a href={row.url} target="_blank" rel="noreferrer">
                        {row.url}
                      </a>
                    </div>
                    <button
                      type="button"
                      className="btn btn-dark louise-copy"
                      onClick={() => markCopied(row.name, row.url)}
                    >
                      {copiedKey === row.name ? 'Copied' : 'Copy'}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="form-note" style={{ marginTop: 16 }}>
              Links appear here once you paste names.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
