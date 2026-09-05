import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { isAdminUnlocked, unlockAdmin } from '../lib/adminAuth'

export function AdminGate({ children }: { children: ReactNode }) {
  const [ok, setOk] = useState(() => isAdminUnlocked())
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!unlockAdmin(pin)) {
      setError('Wrong PIN')
      return
    }
    setError('')
    setOk(true)
  }

  if (ok) return children

  return (
    <div className="stage">
      <div className="invite louise">
        <div className="louise-page">
          <Link className="back-link" to="/sat-7am">
            ← Back to invitation
          </Link>
          <p className="eyebrow">Staff only</p>
          <h1 className="louise-title">Admin</h1>
          <p className="louise-lead">Enter the staff PIN to manage the list and send invites.</p>
          <form className="form" onSubmit={onSubmit}>
            <label className="field">
              PIN
              <input
                type="password"
                inputMode="numeric"
                autoComplete="off"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
              />
            </label>
            {error ? <p className="form-error">{error}</p> : null}
            <button className="btn btn-primary btn-block" type="submit">
              Unlock
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
