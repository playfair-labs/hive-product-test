import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BounceGuide } from '../components/BounceGuide'
import { EnvelopeIntro } from '../components/EnvelopeIntro'
import { EVENT, type Session } from '../data/sessions'
import { submitForm } from '../lib/submit'

const OPENED_KEY = 'hive-invite-opened'

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
      <h2 data-ball-target>{title}</h2>
      {children}
    </section>
  )
}

function guestNameFromParams(params: URLSearchParams): string {
  return (params.get('name') || '').trim()
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function Invite({ session }: { session: Session }) {
  const [searchParams] = useSearchParams()
  const guestName = guestNameFromParams(searchParams)
  const hasName = guestName.length > 0

  const reducedMotion = useMemo(() => prefersReducedMotion(), [])
  const alreadyOpened = useMemo(() => {
    try {
      return sessionStorage.getItem(OPENED_KEY) === '1'
    } catch {
      return false
    }
  }, [])

  const [showEnvelope, setShowEnvelope] = useState(!alreadyOpened && !reducedMotion)
  const [contentReady, setContentReady] = useState(alreadyOpened || reducedMotion)
  const [bounceActive, setBounceActive] = useState(alreadyOpened || reducedMotion)
  const [heroRevealed, setHeroRevealed] = useState(alreadyOpened || reducedMotion)

  const inviteRef = useRef<HTMLDivElement | null>(null)
  const wordRefs = useRef<(HTMLElement | null)[]>([])

  const onEnvelopeOpened = useCallback(() => {
    try {
      sessionStorage.setItem(OPENED_KEY, '1')
    } catch {
      /* ignore */
    }
    setShowEnvelope(false)
    setContentReady(true)
    setBounceActive(true)
  }, [])

  const onWordBounceDone = useCallback(() => {
    setHeroRevealed(true)
  }, [])

  const [rsvpDone, setRsvpDone] = useState(false)
  const [waitDone, setWaitDone] = useState(false)
  const [rsvpBusy, setRsvpBusy] = useState(false)
  const [waitBusy, setWaitBusy] = useState(false)
  const [rsvpError, setRsvpError] = useState('')
  const [waitError, setWaitError] = useState('')

  const consentTo = hasName
    ? `/${session.id}/consent?name=${encodeURIComponent(guestName)}`
    : `/${session.id}/consent`

  const titleWords = ['You’ve', 'been', 'selected']

  async function onRsvp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setRsvpError('')
    if (!hasName) {
      setRsvpError('This invite needs your personal link from The Hive.')
      return
    }
    const fd = new FormData(e.currentTarget)
    const confidential = fd.get('confidential') === 'on'
    if (!confidential) {
      setRsvpError('Please agree to keep things private.')
      return
    }
    setRsvpBusy(true)
    try {
      await submitForm('rsvp', {
        name: guestName,
        session: session.id,
        time: session.timeLabel,
        confidentiality: 'yes',
        no_photos: 'yes',
      })
      setRsvpDone(true)
    } catch (err) {
      setRsvpError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setRsvpBusy(false)
    }
  }

  async function onWaitlist(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setWaitError('')
    const fd = new FormData(e.currentTarget)
    const name = String(fd.get('name') || guestName || '').trim()
    const email = String(fd.get('email') || '').trim()
    const phone = String(fd.get('phone') || '').trim()
    const interested = fd.get('interested') === 'on'
    if (!name || !email || !phone || !interested) {
      setWaitError('Please fill everything in and tick that you’d like to be first in line.')
      return
    }
    setWaitBusy(true)
    try {
      await submitForm('waitlist', {
        name,
        email,
        phone,
        session: session.id,
        time: session.timeLabel,
        interested: 'yes',
      })
      setWaitDone(true)
    } catch (err) {
      setWaitError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setWaitBusy(false)
    }
  }

  return (
    <div className="stage">
      <div className="invite" ref={inviteRef}>
        {showEnvelope ? <EnvelopeIntro onOpened={onEnvelopeOpened} /> : null}

        {contentReady ? (
          <>
            <BounceGuide
              active={bounceActive}
              reducedMotion={reducedMotion || alreadyOpened}
              wordRefs={wordRefs as RefObject<(HTMLElement | null)[]>}
              containerRef={inviteRef}
              onWordBounceDone={onWordBounceDone}
            />

            <header className={`hero${heroRevealed ? ' hero-revealed' : ' hero-waiting'}`}>
              <div className={`hero-logo-wrap${heroRevealed ? ' is-shown' : ''}`}>
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
                {hasName && heroRevealed ? <p className="hero-hi">Hi, {guestName}</p> : null}
                <p className={`brand${heroRevealed ? ' is-shown' : ''}`}>{EVENT.name}</p>
                <h1 className="hero-title">
                  {titleWords.map((word, i) => (
                    <span
                      key={word}
                      className="hero-word"
                      data-ball-target={i === 1 ? true : undefined}
                      ref={(el) => {
                        wordRefs.current[i] = el
                      }}
                    >
                      {word}
                    </span>
                  ))}
                </h1>
                <p className={`hero-sub${heroRevealed ? ' is-shown' : ''}`}>
                  An exclusive chance to test a new product designed to enhance your pickleball
                  game.
                </p>
              </div>
            </header>

            <div className={`sheet${heroRevealed ? ' is-shown' : ' is-dimmed'}`}>
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
                {!hasName ? (
                  <p className="form-error">
                    This invite needs your personal link from The Hive. Please use the link you were
                    sent.
                  </p>
                ) : null}
                {rsvpDone ? (
                  <div className="success">
                    <h3>You’re in</h3>
                    <p>
                      See you {EVENT.dateShort} at {session.timeLabel}
                      {hasName ? `, ${guestName}` : ''}. Keep this link — you may need it on the day.
                    </p>
                  </div>
                ) : (
                  <form className="form" onSubmit={onRsvp}>
                    {hasName ? (
                      <div className="name-locked">
                        <span>Confirming for</span>
                        {guestName}
                      </div>
                    ) : null}
                    <label className="check">
                      <input name="confidential" type="checkbox" required disabled={!hasName} />
                      <span>
                        I agree to keep the product confidential and will not take photographs
                        during the session.
                      </span>
                    </label>
                    {rsvpError ? <p className="form-error">{rsvpError}</p> : null}
                    <button
                      className="btn btn-primary btn-block"
                      type="submit"
                      disabled={rsvpBusy || !hasName}
                    >
                      {rsvpBusy ? 'Sending…' : 'Confirm attendance'}
                    </button>
                  </form>
                )}
              </Section>

              <Section eyebrow="On the day · or anytime" title="Want to be among the first?">
                <p>
                  If you love what you try and want to be among the first to get one when it
                  arrives, leave your details here. Same invitation — no rush.
                </p>
                {waitDone ? (
                  <div className="success">
                    <h3>You’re on the list</h3>
                    <p>We’ll be in touch when it’s time. Thank you.</p>
                  </div>
                ) : (
                  <form className="form" onSubmit={onWaitlist}>
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
                    <label className="field">
                      Email
                      <input
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        placeholder="you@email.com"
                      />
                    </label>
                    <label className="field">
                      Phone
                      <input
                        name="phone"
                        type="tel"
                        autoComplete="tel"
                        required
                        placeholder="Mobile number"
                      />
                    </label>
                    <label className="check">
                      <input name="interested" type="checkbox" required />
                      <span>
                        Yes — I’d like to be among the first to get one when it arrives. Keep me in
                        the loop.
                      </span>
                    </label>
                    {waitError ? <p className="form-error">{waitError}</p> : null}
                    <button className="btn btn-dark btn-block" type="submit" disabled={waitBusy}>
                      {waitBusy ? 'Sending…' : 'Keep me first in line'}
                    </button>
                  </form>
                )}
              </Section>

              <p className="footer-mini">
                From {EVENT.from}
                <br />
                <Link to={consentTo}>Day-of film consent</Link>
                {' · '}
                optional, no pressure
              </p>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
