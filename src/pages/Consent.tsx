import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { EVENT, type Session } from '../data/sessions'
import { submitForm } from '../lib/submit'

export function Consent({ session }: { session: Session }) {
  const [searchParams] = useSearchParams()
  const guestName = (searchParams.get('name') || '').trim()
  const hasName = guestName.length > 0

  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const backTo = hasName
    ? `/${session.id}?name=${encodeURIComponent(guestName)}`
    : `/${session.id}`

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.currentTarget)
    const name = String(fd.get('name') || guestName || '').trim()
    const film = fd.get('film') === 'on'
    const promo = fd.get('promo') === 'on'
    if (!name || !film) {
      setError('Please add your name and confirm you’re happy to be filmed.')
      return
    }
    setBusy(true)
    try {
      await submitForm('consent', {
        name,
        session: session.id,
        time: session.timeLabel,
        film: 'yes',
        promo_use: promo ? 'yes' : 'no',
      })
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stage">
      <div className="invite">
        <div className="consent-page">
          <Link className="back-link" to={backTo}>
            ← Back to invitation
          </Link>
          <p className="eyebrow">Optional · day of</p>
          <h2
            style={{
              fontFamily: 'Fraunces, Georgia, serif',
              color: 'var(--green-deep)',
              margin: '0 0 12px',
              fontSize: 32,
            }}
          >
            A quick chat on camera?
          </h2>
          <p>
            Near the end of your session we may ask for a short, friendly interview about what you
            tried. Totally optional — say no and that’s perfectly fine.
          </p>
          <p>
            If you’re happy to take part, we might use a clip to help tell the story of{' '}
            {EVENT.name}. We’d only do that with your say-so below.
          </p>
          <p className="form-note" style={{ marginBottom: 16 }}>
            Your session: {EVENT.dateShort} · {session.timeLabel}
          </p>

          {done ? (
            <div className="success">
              <h3>Thank you</h3>
              <p>You’re all set. Enjoy the rest of the session.</p>
            </div>
          ) : (
            <form className="form" onSubmit={onSubmit}>
              <label className="field">
                Full name
                <input
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  defaultValue={guestName}
                  readOnly={hasName}
                  placeholder="Your full name"
                />
              </label>
              <label className="check">
                <input name="film" type="checkbox" required />
                <span>I’m happy to be filmed for a short interview today.</span>
              </label>
              <label className="check">
                <input name="promo" type="checkbox" />
                <span>
                  I’m happy for The Pickleball Hive to use this interview for promotional purposes.
                </span>
              </label>
              {error ? <p className="form-error">{error}</p> : null}
              <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Agree & sign with my name'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
