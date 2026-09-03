import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { EVENT, type Session } from '../data/sessions'
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
  eyebrow: string
  title: string
  children: ReactNode
  id?: string
}) {
  const ref = useReveal()
  return (
    <section className="section" ref={ref} id={id}>
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {children}
    </section>
  )
}

export function Invite({ session }: { session: Session }) {
  const [rsvpDone, setRsvpDone] = useState(false)
  const [waitDone, setWaitDone] = useState(false)
  const [rsvpBusy, setRsvpBusy] = useState(false)
  const [waitBusy, setWaitBusy] = useState(false)
  const [rsvpError, setRsvpError] = useState('')
  const [waitError, setWaitError] = useState('')

  async function onRsvp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setRsvpError('')
    const fd = new FormData(e.currentTarget)
    const name = String(fd.get('name') || '').trim()
    const confidential = fd.get('confidential') === 'on'
    if (!name || !confidential) {
      setRsvpError('Please add your name and agree to keep things private.')
      return
    }
    setRsvpBusy(true)
    try {
      await submitForm('rsvp', {
        name,
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
    const name = String(fd.get('name') || '').trim()
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
            <p className="brand">{EVENT.name}</p>
            <h1>You’ve been selected</h1>
            <p className="hero-sub">
              An exclusive chance to test a new product designed to enhance your pickleball game.
            </p>
          </div>
        </header>

        <div className="sheet">
          <Section eyebrow="With our thanks" title="You’re one of a small group">
            <p>
              Thank you. You’ve been invited to come along and test a new product soon to hit the
              market — developed to enhance your game and make it easier to try new shots.
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
              Near the end, we may ask for a quick interview about the product and scoring system.
              You’re not obliged to take part.
            </p>
            <p>
              If you do, we’d only use it for promotional purposes with your approval — and you can
              sort that on the day, no pressure.
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

          <Section eyebrow="Please confirm" title="We would be honoured if you could join us" id="rsvp">
            <p className="form-note">RSVP by {EVENT.rsvpDeadline}.</p>
            {rsvpDone ? (
              <div className="success">
                <h3>You’re in</h3>
                <p>
                  See you {EVENT.dateShort} at {session.timeLabel}. Keep this link — you may need it
                  on the day.
                </p>
              </div>
            ) : (
              <form className="form" onSubmit={onRsvp}>
                <label className="field">
                  Full name
                  <input name="name" type="text" autoComplete="name" required placeholder="Your full name" />
                </label>
                <label className="check">
                  <input name="confidential" type="checkbox" required />
                  <span>
                    I agree to keep the product confidential and will not take photographs during
                    the session.
                  </span>
                </label>
                {rsvpError ? <p className="form-error">{rsvpError}</p> : null}
                <button className="btn btn-primary btn-block" type="submit" disabled={rsvpBusy}>
                  {rsvpBusy ? 'Sending…' : 'Confirm attendance'}
                </button>
              </form>
            )}
          </Section>

          <Section eyebrow="On the day · or anytime" title="Want to be among the first?">
            <p>
              If you love what you try and want to be among the first to get one when it arrives,
              leave your details here. Same invitation — no rush.
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
                  <input name="name" type="text" autoComplete="name" required placeholder="Your full name" />
                </label>
                <label className="field">
                  Email
                  <input name="email" type="email" autoComplete="email" required placeholder="you@email.com" />
                </label>
                <label className="field">
                  Phone
                  <input name="phone" type="tel" autoComplete="tel" required placeholder="Mobile number" />
                </label>
                <label className="check">
                  <input name="interested" type="checkbox" required />
                  <span>
                    Yes — I’d like to be among the first to get one when it arrives. Keep me in the
                    loop.
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
            <Link to={`/${session.id}/consent`}>Day-of film consent</Link>
            {' · '}
            optional, no pressure
          </p>
        </div>
      </div>
    </div>
  )
}
