import { useState } from 'react'
import { Pickleball } from './Pickleball'

type Props = {
  onOpened: () => void
}

export function EnvelopeIntro({ onOpened }: Props) {
  const [opening, setOpening] = useState(false)

  function open() {
    if (opening) return
    setOpening(true)
    window.setTimeout(() => onOpened(), 700)
  }

  return (
    <button
      type="button"
      className={`envelope-screen${opening ? ' is-opening' : ''}`}
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
  )
}
