import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { isDayPageOpen, type Session } from '../data/sessions'
import { submitForm } from '../lib/submit'

export function Day({ session }: { session: Session }) {
  const [searchParams] = useSearchParams()
  const guestName = (searchParams.get('name') || '').trim()
  const hasName = guestName.length > 0
  const open = isDayPageOpen(searchParams, session)

  const [waitDone, setWaitDone] = useState(false)
  const [waitBusy, setWaitBusy] = useState(false)
  const [waitError, setWaitError] = useState('')
  const [consentDone, setConsentDone] = useState(false)
  const [consentBusy, setConsentBusy] = useState(false)
  const [consentError, setConsentError] = useState('')

  const backTo = hasName
    ? `/${session.id}?name=${encodeURIComponent(guestName)}`
    : `/${session.id}`

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [session.id])

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

  async function onConsent(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setConsentError('')
    const fd = new FormData(e.currentTarget)
    const name = String(fd.get('name') || guestName || '').trim()
    const film = fd.get('film') === 'on'
    const promo = fd.get('promo') === 'on'
    if (!name || !film) {
      setConsentError('Please add your name and confirm you’re happy to be filmed.')
      return
    }
    setConsentBusy(true)
    try {
      await submitForm('consent', {
        name,
        session: session.id,
        time: session.timeLabel,
        film: 'yes',
        promo_use: promo ? 'yes' : 'no',
      })
      setConsentDone(true)
    } catch (err) {
      setConsentError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setConsentBusy(false)
    }
  }

  return (
    <div className="stage">
      <div className="invite">
        <div className="consent-page">
          <Link className="back-link" to={backTo}>
            ← Back to invitation
          </Link>

          {open ? (
            <>
              <p className="eyebrow">Optional</p>
              <h2 className="day-heading">A quick chat on camera?</h2>
              <p>
                We are a small company, just starting out and we’d love to be able to capture the
                excitement of your day, so we can show others how great it is. We’d also like to be
                able to use that in the future to share as a testimonial. If you are happy to do
                that, please fill out the section below. Thanks
              </p>
              <p className="form-note" style={{ marginBottom: 16 }}>
                Your session: {session.dateShort} · {session.timeLabel} · {session.timeEndLabel}
              </p>

              {consentDone ? (
                <div className="success">
                  <h3>Thank you</h3>
                  <p>You’re all set. Enjoy the rest of the session.</p>
                </div>
              ) : (
                <form className="form" onSubmit={onConsent}>
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
                      I’m happy for The Pickleball Hive to use this interview for promotional
                      purposes.
                    </span>
                  </label>
                  {consentError ? <p className="form-error">{consentError}</p> : null}
                  <button className="btn btn-primary btn-block" type="submit" disabled={consentBusy}>
                    {consentBusy ? 'Saving…' : 'Agree & sign with my name'}
                  </button>
                </form>
              )}

              <hr className="day-rule" />

              <p className="eyebrow">On the day · or anytime</p>
              <h2 className="day-heading">Want to be among the first?</h2>
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
            </>
          ) : (
            <div className="day-teaser">
              <p className="eyebrow">On the day</p>
              <h2 className="day-heading">More to come on the day…</h2>
              <p>We’ll unlock a few extras here when you arrive. Keep this link handy.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
