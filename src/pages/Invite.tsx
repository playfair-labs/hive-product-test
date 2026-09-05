import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { EVENT, SESSION_CAPACITY, type Session } from '../data/sessions'
import { claimSeat, readLocalRsvp, saveLocalRsvp } from '../lib/attendance'
import { upsertConfirmed } from '../lib/roster'
import { submitForm } from '../lib/submit'

const LOUISE_NOTE_FONTS =
  'https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap'

function useReveal() {
  const ref = useRef<HTMLElement | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          el.classList.add('in')
          io.disconnect()
        }
      },
      { threshold: 0.18 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return ref
}

function Section({
  eyebrow,
  title,
  children,
  id,
}: {
  eyebrow?: string
  title?: string
  children: ReactNode
  id?: string
}) {
  const ref = useReveal()
  return (
    <section className="section" ref={ref} id={id}>
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      {title ? <h2>{title}</h2> : null}
      {children}
    </section>
  )
}

function guestNameFromParams(params: URLSearchParams): string {
  return (params.get('name') || '').trim()
}

export function Invite({ session }: { session: Session }) {
  const [searchParams] = useSearchParams()
  const lockedName = guestNameFromParams(searchParams)
  const hasLockedName = lockedName.length > 0

  const [typedName, setTypedName] = useState('')
  const [rsvpDone, setRsvpDone] = useState(false)
  const [place, setPlace] = useState<number | null>(null)
  const [rsvpBusy, setRsvpBusy] = useState(false)
  const [rsvpError, setRsvpError] = useState('')

  const guestName = hasLockedName ? lockedName : typedName.trim()
  const dayTo = guestName
    ? `/${session.id}/day?name=${encodeURIComponent(guestName)}`
    : `/${session.id}/day`

  useEffect(() => {
    const id = 'louise-note-fonts'
    if (document.getElementById(id)) return
    const link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    link.href = LOUISE_NOTE_FONTS
    document.head.appendChild(link)
  }, [])

  useEffect(() => {
    if (!hasLockedName) return
    const saved = readLocalRsvp(session.id, lockedName)
    if (!saved) return
    setRsvpDone(true)
    setPlace(saved.place)
  }, [hasLockedName, lockedName, session.id])

  async function onRsvp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setRsvpError('')
    const fd = new FormData(e.currentTarget)
    const name = (hasLockedName ? lockedName : String(fd.get('name') || '')).trim()
    if (!name) {
      setRsvpError('Please add your name.')
      return
    }
    if (fd.get('confidential') !== 'on') {
      setRsvpError('Please agree to keep things private.')
      return
    }
    setRsvpBusy(true)
    try {
      const seat = await claimSeat(session.id, name)
      await submitForm('rsvp', {
        name,
        session: session.id,
        time: session.timeLabel,
        confidentiality: 'yes',
        no_photos: 'yes',
        place: seat ? String(seat) : '',
        of: String(SESSION_CAPACITY),
      })
      saveLocalRsvp(session.id, name, seat)
      upsertConfirmed(name, session.id, seat)
      if (!hasLockedName) setTypedName(name)
      setPlace(seat)
      setRsvpDone(true)
    } catch (err) {
      setRsvpError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setRsvpBusy(false)
    }
  }

  return (
    <div className="stage">
      <style>{`
        .louise-note {
          width: min(92%, 340px);
          margin: 8px auto 28px;
          padding: 22px 22px 18px;
          background:
            linear-gradient(180deg, #f7f1e4 0%, #efe6d4 100%);
          color: #2a241c;
          border-radius: 4px 12px 6px 10px;
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.55) inset,
            0 10px 28px rgba(0, 0, 0, 0.28);
          transform: rotate(-0.6deg);
          text-align: left;
        }
        .louise-note-body {
          margin: 0;
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(17px, 4.2vw, 19px);
          font-weight: 400;
          line-height: 1.45;
          letter-spacing: 0.01em;
          white-space: pre-line;
        }
        .louise-note-sign {
          display: block;
          margin: 14px 0 0;
          font-family: "Great Vibes", "Apple Chancery", cursive;
          font-size: clamp(40px, 10vw, 52px);
          line-height: 1;
          color: #1f1a14;
          font-weight: 400;
        }
        .louise-note-ps {
          margin: 10px 0 0;
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(16px, 4vw, 18px);
          font-weight: 400;
          line-height: 1.4;
          color: #2a241c;
        }
        .hero-when {
          margin: 10px auto 0;
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(40px, 10.5vw, 64px);
          line-height: 1.05;
          letter-spacing: -0.03em;
          color: var(--cream);
          font-weight: 700;
          max-width: 16ch;
        }
        .hero-time {
          margin: 6px auto 0;
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(34px, 9vw, 52px);
          line-height: 1.1;
          letter-spacing: -0.02em;
          color: var(--cream);
          font-weight: 700;
        }
        .hero-venue {
          margin: 16px auto 0;
          font-size: 18px;
          line-height: 1.35;
          color: rgba(239, 231, 173, 0.88);
          font-weight: 700;
        }
        .hero-invite-label {
          margin: 0 0 10px;
          font-size: 13px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--cream);
          font-weight: 700;
          opacity: 0.85;
        }
        .hero-youre-invited {
          margin: 0 auto;
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(28px, 7vw, 36px);
          line-height: 1.1;
          letter-spacing: -0.02em;
          color: var(--cream);
          font-weight: 700;
        }
        .sheet-product-name {
          margin: 0 0 16px;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 22px;
          line-height: 1.25;
          color: inherit;
          font-weight: 700;
        }
      `}</style>
      <div className="invite">
        <header className="hero">
          <div className="hero-logo-wrap">
            <img
              className="hero-logo"
              src={`${import.meta.env.BASE_URL}hive-logo.png`}
              alt="The Pickleball Hive"
              width={900}
              height={825}
            />
          </div>

          <aside className="louise-note" aria-label="A note from Louise">
            <p className="louise-note-body">
              {`Hey guys, my brothers Alan & Lloyd are coming to the Hive! It's a great opportunity that will book out fast. Andy and I love it, and it's free!
:-)`}
            </p>
            <span className="louise-note-sign">Louise</span>
            <p className="louise-note-ps">PS - Only 8 places available, first in, best dressed !</p>
          </aside>

          <div className="hero-copy">
            <p className="hero-invite-label">Private invitation</p>
            <p className="hero-youre-invited">You’re invited</p>
            <p className="hero-when">{session.dateLabel}</p>
            <p className="hero-time">
              {session.timeLabel} · {session.timeEndLabel}
            </p>
            <p className="hero-venue">The Pickleball Hive, Buderim</p>
          </div>
        </header>

        <div className="sheet">
          <Section title="You’ve been selected">
            <p className="sheet-product-name">{EVENT.name}</p>
            <p>
              You’ve been invited to test a new product soon to hit the market — developed to
              enhance your game with spin and feel.
            </p>
            <p>
              You’ll also get to test a new scoring system that maximises your potential, every
              session.
            </p>
          </Section>

          <Section eyebrow="Session format" title="Two hours — we’d love you there">
            <div className="hours">
              <div className="hour">
                <strong>Hour 1</strong>
                Trying the product
              </div>
              <div className="hour">
                <strong>Hour 2</strong>
                Playing with it, using the new scoring, and a short feedback session :-)
              </div>
            </div>
          </Section>

          <Section eyebrow="Confidentiality" title="Shhhhhhhhhhh...">
            <p className="shhhh">It’s not out yet.</p>
            <ul className="rules">
              <li>No photos during the session, please.</li>
              <li>Please don’t share details about the new product.</li>
            </ul>
          </Section>

          <Section eyebrow="Your feedback" title="A short chat — only if you want">
            <p>
              Near the end we might ask for a quick chat about the product and the scoring. Totally
              up to you.
            </p>
            <p>
              And if we ever wanted to use that chat in anything public, we’d check with you first —
              no surprises. Easy to sort on the day.
            </p>
          </Section>

          <Section eyebrow="When & where" id="details">
            <div className="meta">
              <div className="meta-row">
                <span>Date</span>
                <strong>{session.dateLabel}</strong>
              </div>
              <div className="meta-row">
                <span>Time</span>
                <strong>
                  {session.timeLabel} · {session.timeEndLabel}
                </strong>
              </div>
              <div className="meta-row">
                <span>Venue</span>
                <strong>
                  {EVENT.venue}
                  <br />
                  {EVENT.address}
                </strong>
              </div>
            </div>
          </Section>

          <Section title="We’d love you to join us." id="rsvp">
            <p className="form-note">Please RSVP by Saturday 12 September.</p>
            <p className="form-note">This invitation is just for you — please don’t share the link.</p>
            {rsvpDone ? (
              <div className="success">
                <h3>You’re in.</h3>
                {place ? (
                  <p className="seat-count">
                    You are <strong>{place}</strong> of {SESSION_CAPACITY}
                  </p>
                ) : null}
                <p>
                  See you {session.dateShort} at {session.timeLabel}. Keep this page handy for the
                  day.
                </p>
              </div>
            ) : (
              <form className="form" onSubmit={onRsvp}>
                {hasLockedName ? (
                  <div className="name-locked">
                    <span>Confirming for</span>
                    {lockedName}
                  </div>
                ) : (
                  <label className="field">
                    Your name
                    <input
                      name="name"
                      type="text"
                      autoComplete="name"
                      required
                      value={typedName}
                      onChange={(e) => setTypedName(e.target.value)}
                      placeholder="Your full name"
                    />
                  </label>
                )}
                <label className="check">
                  <input name="confidential" type="checkbox" required />
                  <span>
                    I’ll keep the product to myself and won’t take photos during the session.
                  </span>
                </label>
                {rsvpError ? <p className="form-error">{rsvpError}</p> : null}
                <button className="btn btn-primary btn-block" type="submit" disabled={rsvpBusy}>
                  {rsvpBusy ? 'Sending…' : 'Confirm attendance'}
                </button>
              </form>
            )}
          </Section>

          <p className="footer-mini">
            From {EVENT.from}
            <span className="footer-actions">
              <Link className="footer-day" to={dayTo}>
                On the day
              </Link>
              <Link className="footer-admin" to="/admin">
                Admin
              </Link>
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}
