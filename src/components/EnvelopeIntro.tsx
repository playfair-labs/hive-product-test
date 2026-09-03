import { useEffect, useState } from 'react'
import { Pickleball } from './Pickleball'

type Props = {
  onOpened: () => void
  /** Auto-open if guest never taps (blockers / stuck UI) */
  autoOpenMs?: number
}

export function EnvelopeIntro({ onOpened, autoOpenMs = 6000 }: Props) {
  const [opening, setOpening] = useState(false)

  function open() {
    if (opening) return
    setOpening(true)
    window.setTimeout(() => onOpened(), 500)
  }

  useEffect(() => {
    const t = window.setTimeout(() => open(), autoOpenMs)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open once on mount timer
  }, [autoOpenMs])

  return (
    <div className={`envelope-screen${opening ? ' is-opening' : ''}`}>
      <button
        type="button"
        className="envelope-hit"
        onClick={open}
        aria-label="Open invitation"
      >
        <div className="envelope" aria-hidden="true">
          <div className="envelope-flap" />
          <div className="envelope-body">
            <div className="envelope-ball-peek">
              <Pickleball size={48} />
            </div>
            <div className="envelope-seal">H</div>
          </div>
        </div>
        <span className="envelope-hint">{opening ? 'Opening…' : 'Tap to open'}</span>
      </button>
      <button type="button" className="envelope-skip" onClick={open} disabled={opening}>
        Skip — open invitation
      </button>
    </div>
  )
}
