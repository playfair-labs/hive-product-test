import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { EVENT, SESSION_CAPACITY, type Session } from '../data/sessions'
import { claimSeat, readLocalRsvp, saveLocalRsvp } from '../lib/attendance'
import { upsertConfirmed } from '../lib/roster'
import { submitForm } from '../lib/submit'

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
  title: string
  children: ReactNode
  id?: string
}) {
  const ref = useReveal()
  return (
    <section className="section" ref={ref} id={id}>
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h2>{title}</h2>
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

  useEffect(() => {
    if (!hasLockedName) return
    const saved = readLocalRsvp(session.id, lockedName)
    if (!saved) return
    setRsvpDone(true)
    setPlace(saved.place)
  }, [hasLockedName, lockedName, session.id])

  const dayTo = guestName
    ? `/${session.id}/day?name=${encodeURIComponent(guestName)}`
    : `/${session.id}/day`

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
                <p className="seal-label">Private invitation</p>
              </div>
              <div className="hero-copy">
                {hasLockedName ? <p className="hero-hi">Hi, {lockedName}</p> : null}
                <p className="brand">{EVENT.name}</p>
                <h1 className="hero-title">You’ve been selected</h1>
                <p className="hero-sub">
                  An exclusive chance to test a new product designed to enhance your pickleball
                  game.
                </p>
              </div>
            </header>

            <div className="sheet">
              <Section title="You’re one of a small group">
                <p>
                  You’ve been invited to come along and test a new product soon to hit the market —
                  developed to enhance your game and make it easier to try new shots.
                </p>
                <p>
                  You’ll also get to try an exciting new scoring system that has proven to enhance
                  shot-making.
                </p>
              </Section>

              <Section eyebrow="Session format" title="Two hours · we’d love you there">
                <div className="hours">
                  <div className="hour">
                    <strong>First hour</strong>
                    Testing the products
                  </div>
                  <div className="hour">
                    <strong>Second hour</strong>
                    Using the products and putting the new scoring system into practice
                  </div>
                </div>
              </Section>

              <Section eyebrow="Confidentiality" title="Shhhhhhhhhhh…">
                <p className="shhhh">This hasn’t been released yet.</p>
                <ul className="rules">
                  <li>Take no photographs during the session</li>
                  <li>Don’t share details about the new product</li>
                </ul>
              </Section>

              <Section eyebrow="Your feedback" title="A short chat — only if you want">
                <p>
                  Near the end, we may ask for a quick interview about the product and scoring
                  system. You’re not obliged to take part.
                </p>
                <p>
                  If you do, we’d only use it for promotional purposes with your approval — and you
                  can sort that on the day, no pressure.
                </p>
              </Section>

              <Section eyebrow="When & where" title="Your session" id="details">
                <div className="meta">
                  <div className="meta-row">
                    <span>Date</span>
                    <strong>{EVENT.dateLabel}</strong>
                  </div>
                  <div className="meta-row">
                    <span>Time</span>
                    <strong>
                      {session.timeLabel} · {session.duration}
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
                <div className="chips">
                  <span className="chip green">{EVENT.dateShort}</span>
                  <span className="chip">{session.timeLabel}</span>
                  <span className="chip">Buderim</span>
                </div>
              </Section>

              <Section title="We’d love you to join us." id="rsvp">
                <p className="form-note">RSVP by {EVENT.rsvpDeadline}.</p>
                <p className="form-note">
                  This invitation is for you — please don’t share the link.
                </p>
                {rsvpDone ? (
                  <div className="success">
                    <h3>You’re in</h3>
                    {place ? (
                      <p className="seat-count">
                        You are <strong>{place}</strong> of {SESSION_CAPACITY}
                      </p>
                    ) : null}
                    <p>
                      See you {EVENT.dateShort} at {session.timeLabel}
                      {guestName ? `, ${guestName}` : ''}. Keep this link — you may need it on the day.
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
                        I agree to keep the product confidential and will not take photographs
                        during the session.
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
