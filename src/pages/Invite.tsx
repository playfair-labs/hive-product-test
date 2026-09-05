import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { EVENT, SESSION_CAPACITY, type Session } from '../data/sessions'
import {
  claimSeat,
  clearLocalRsvp,
  getSessionTaken,
  readLocalRsvp,
  releaseSeat,
  saveLocalRsvp,
  SessionFullError,
} from '../lib/attendance'
import { downloadSessionCalendar } from '../lib/calendar'
import { cancelGuest, upsertConfirmed } from '../lib/roster'
import { submitForm } from '../lib/submit'

const LOUISE_NOTE_FONTS =
  'https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap'

/** Keep cant-come flow in code; set true to show the guest decline buttons again. */
const SHOW_CANT_COME = false

function scarcityLine(taken: number): string {
  if (taken <= 0) return `${SESSION_CAPACITY} spots for this session — first in, best dressed.`
  if (taken >= SESSION_CAPACITY) return 'This session is full.'
  if (taken >= 6) {
    const left = SESSION_CAPACITY - taken
    return left === 1 ? 'Only 1 spot left.' : `Only ${left} spots left.`
  }
  return `${taken} of ${SESSION_CAPACITY} spots taken.`
}

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
  const [mobile, setMobile] = useState('')
  const [rsvpDone, setRsvpDone] = useState(false)
  const [place, setPlace] = useState<number | null>(null)
  const [rsvpBusy, setRsvpBusy] = useState(false)
  const [rsvpError, setRsvpError] = useState('')
  const [taken, setTaken] = useState<number | null>(null)
  const [cancelBusy, setCancelBusy] = useState(false)
  const [declined, setDeclined] = useState(false)

  const guestName = hasLockedName ? lockedName : typedName.trim()
  const dayTo = guestName
    ? `/${session.id}/day?name=${encodeURIComponent(guestName)}`
    : `/${session.id}/day`
  const sessionFull = (taken ?? 0) >= SESSION_CAPACITY && !rsvpDone

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

  useEffect(() => {
    let cancelled = false

    async function refreshTaken() {
      const n = await getSessionTaken(session.id)
      if (!cancelled) setTaken(n)
    }

    void refreshTaken()
    function onVis() {
      if (document.visibilityState === 'visible') void refreshTaken()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [session.id])

  async function onRsvp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setRsvpError('')
    const fd = new FormData(e.currentTarget)
    const name = (hasLockedName ? lockedName : String(fd.get('name') || '')).trim()
    const phone = String(fd.get('mobile') || mobile || '').trim()
    if (!name) {
      setRsvpError('Please add your name.')
      return
    }
    if (fd.get('commitment') !== 'on') {
      setRsvpError('Please confirm you’ll be there.')
      return
    }
    if (fd.get('confidential') !== 'on') {
      setRsvpError('Please agree to keep things private.')
      return
    }
    setRsvpBusy(true)
    try {
      const seat = await claimSeat(session.id, name)
      if (!seat) {
        setRsvpError('Couldn’t lock a spot — try again.')
        return
      }
      await submitForm('rsvp', {
        name,
        session: session.id,
        time: `${session.timeLabel} · ${session.timeEndLabel}`,
        date: session.dateLabel,
        mobile: phone,
        commitment: 'yes',
        confidentiality: 'yes',
        no_photos: 'yes',
        place: String(seat),
        of: String(SESSION_CAPACITY),
      })
      saveLocalRsvp(session.id, name, seat)
      upsertConfirmed(name, session.id, seat)
      if (!hasLockedName) setTypedName(name)
      setPlace(seat)
      setRsvpDone(true)
      setTaken(await getSessionTaken(session.id))
    } catch (err) {
      if (err instanceof SessionFullError) {
        setTaken(SESSION_CAPACITY)
        setRsvpError('This session just filled up. Join the waitlist on the day page.')
      } else {
        setRsvpError(err instanceof Error ? err.message : 'Something went wrong')
      }
    } finally {
      setRsvpBusy(false)
    }
  }

  async function onCantCome() {
    const name = (hasLockedName ? lockedName : typedName).trim() || guestName
    if (!name) {
      setRsvpError('Add your name first so we know who to replace.')
      return
    }
    if (
      !window.confirm(
        rsvpDone
          ? 'Thanks — we’ll free your spot so someone else can come. Is that OK?'
          : 'Thanks — we’ll note you can’t make it so Louise can invite someone else. OK?',
      )
    ) {
      return
    }
    setCancelBusy(true)
    setRsvpError('')
    try {
      const hadSeat = Boolean(readLocalRsvp(session.id, name)?.place) || rsvpDone
      if (hadSeat) {
        await releaseSeat(session.id, name)
      } else {
        clearLocalRsvp(session.id, name)
      }
      cancelGuest(name, session.id)
      await submitForm('cancel', {
        name,
        session: session.id,
        time: `${session.timeLabel} · ${session.timeEndLabel}`,
        date: session.dateLabel,
        note: hadSeat
          ? 'Guest cannot attend — please send a replacement invite'
          : 'Guest declined invite — please send a replacement invite',
      })
      setRsvpDone(false)
      setPlace(null)
      setDeclined(true)
      setTaken(await getSessionTaken(session.id))
    } catch (err) {
      setRsvpError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setCancelBusy(false)
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
        .sheet-product-name {
          margin: 0 0 16px;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 22px;
          line-height: 1.25;
          color: inherit;
          font-weight: 700;
        }
        .spots-live {
          margin: 0 0 12px;
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(22px, 5.5vw, 28px);
          line-height: 1.25;
          font-weight: 700;
          color: inherit;
        }
        .spots-live.hot {
          color: #2f6b28;
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
              {`Hey guys, my brothers Alan & Lloyd are coming to the Hive!
It's a great opportunity that will book out fast. Andy and I love it, and it's free!
:-)`}
            </p>
            <span className="louise-note-sign">Louise</span>
            <p className="louise-note-ps">PS - Only 8 places available, first in, best dressed !</p>
          </aside>

          <div className="hero-copy">
            <p className="hero-invite-label">Private invitation</p>
            <p className="hero-when">{session.dateLabel}</p>
            <p className="hero-time">
              {session.timeLabel} · {session.timeEndLabel}
            </p>
            <p className="hero-venue">The Pickleball Hive, Buderim</p>
          </div>
        </header>

        <div className="sheet">
          <Section title="New Product Test">
            <p>
              You’ve been invited to test a new product soon to hit the market — developed to
              enhance your game with spin and feel.
            </p>
            <p>
              You’ll also get to test a new scoring system that’s super fun and maximises your
              potential, every session.
            </p>
          </Section>

          <Section eyebrow="Session format">
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
            <p className={`spots-live${(taken ?? 0) >= 6 && (taken ?? 0) < SESSION_CAPACITY ? ' hot' : ''}`}>
              {scarcityLine(taken ?? 0)}
            </p>
            {!sessionFull && !rsvpDone ? (
              <p className="form-note">RSVP below ASAP to get one of the 8 spaces</p>
            ) : null}
            <p className="form-note">This invitation is just for you — please don’t share the link.</p>

            {declined ? (
              <div className="success">
                <h3>Thanks for letting us know</h3>
                <p>
                  We’ve freed that invitation so Louise can offer the spot to someone else. No
                  worries at all.
                </p>
              </div>
            ) : rsvpDone ? (
              <div className="success">
                <h3>Your spot is locked.</h3>
                {place ? (
                  <p className="seat-count">
                    You are <strong>{place}</strong> of {SESSION_CAPACITY}
                  </p>
                ) : null}
                <p>
                  See you {session.dateShort} at {session.timeLabel} · {session.timeEndLabel}.
                </p>
                <p>Keep this page or take a screenshot — show it when you arrive.</p>
                <button
                  type="button"
                  className="btn btn-dark btn-block"
                  style={{ marginTop: 14 }}
                  onClick={() => downloadSessionCalendar(session)}
                >
                  Add to calendar
                </button>
                {SHOW_CANT_COME ? (
                  <button
                    type="button"
                    className="btn btn-block"
                    style={{ marginTop: 10 }}
                    disabled={cancelBusy}
                    onClick={() => void onCantCome()}
                  >
                    {cancelBusy ? 'Updating…' : 'Thanks, but I can’t make it'}
                  </button>
                ) : null}
              </div>
            ) : sessionFull ? (
              <div className="success">
                <h3>This session is full</h3>
                <p>
                  All {SESSION_CAPACITY} spots are taken. You can still join the waitlist on the day
                  page — if someone drops out, Louise may have a place.
                </p>
                <Link className="btn btn-primary btn-block" to={dayTo} style={{ marginTop: 14 }}>
                  On the day / waitlist
                </Link>
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
                <label className="field">
                  Mobile <span style={{ fontWeight: 500, opacity: 0.7 }}>(optional)</span>
                  <input
                    name="mobile"
                    type="tel"
                    autoComplete="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="So we can text a reminder"
                  />
                </label>
                <label className="check">
                  <input name="commitment" type="checkbox" required />
                  <span>
                    I’ll be there. If I can’t make it, I’ll tell the Hive so my spot can go to
                    someone else.
                  </span>
                </label>
                <label className="check">
                  <input name="confidential" type="checkbox" required />
                  <span>
                    I’ll keep the product to myself and won’t take photos during the session.
                  </span>
                </label>
                {rsvpError ? <p className="form-error">{rsvpError}</p> : null}
                <button className="btn btn-primary btn-block" type="submit" disabled={rsvpBusy}>
                  {rsvpBusy ? 'Sending…' : 'Claim my spot'}
                </button>
                {SHOW_CANT_COME ? (
                  <button
                    type="button"
                    className="btn btn-block"
                    style={{ marginTop: 10 }}
                    disabled={cancelBusy}
                    onClick={() => void onCantCome()}
                  >
                    {cancelBusy ? 'Updating…' : 'Thanks, but I can’t make it'}
                  </button>
                ) : null}
              </form>
            )}
          </Section>

          <p className="footer-mini">
            From {EVENT.from}
            <span className="footer-actions">
              <Link className="footer-day" to={dayTo}>
                On the day
              </Link>
            </span>
          </p>
          <Link
            className="admin-secret"
            to="/admin"
            aria-label="Staff"
            title=""
          />
        </div>
      </div>
    </div>
  )
}
