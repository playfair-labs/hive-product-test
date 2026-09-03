import { useCallback, useRef, useState, type PointerEvent, type KeyboardEvent } from 'react'

type Props = {
  agreed: boolean
  disabled?: boolean
  onAgreedChange: (agreed: boolean) => void
}

const SNAP = 0.85

export function ConfidentialityZipper({ agreed, disabled, onAgreedChange }: Props) {
  const trackRef = useRef<HTMLDivElement | null>(null)
  const [progress, setProgress] = useState(agreed ? 1 : 0)
  const [dragging, setDragging] = useState(false)
  const progressRef = useRef(progress)
  progressRef.current = progress

  const setProg = useCallback(
    (p: number, commit = false) => {
      const clamped = Math.max(0, Math.min(1, p))
      setProgress(clamped)
      progressRef.current = clamped
      if (commit) {
        if (clamped >= SNAP) {
          setProgress(1)
          onAgreedChange(true)
        } else {
          setProgress(0)
          onAgreedChange(false)
        }
      }
    },
    [onAgreedChange],
  )

  function clientToProgress(clientX: number) {
    const track = trackRef.current
    if (!track) return 0
    const rect = track.getBoundingClientRect()
    const pad = 22
    return (clientX - rect.left - pad) / Math.max(1, rect.width - pad * 2)
  }

  function onPointerDown(e: PointerEvent<HTMLButtonElement>) {
    if (disabled || agreed) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
    setProg(clientToProgress(e.clientX))
  }

  function onPointerMove(e: PointerEvent<HTMLButtonElement>) {
    if (!dragging || disabled || agreed) return
    setProg(clientToProgress(e.clientX))
  }

  function onPointerUp(e: PointerEvent<HTMLButtonElement>) {
    if (!dragging) return
    setDragging(false)
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    setProg(progressRef.current, true)
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (disabled || agreed) return
    if (e.key === 'ArrowRight' || e.key === 'End' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setProg(1, true)
    }
    if (e.key === 'ArrowLeft' || e.key === 'Home' || e.key === 'Escape') {
      e.preventDefault()
      setProg(0, true)
    }
  }

  const pct = Math.round(progress * 100)

  return (
    <div className={`zipper-box${agreed ? ' is-agreed' : ''}${disabled ? ' is-disabled' : ''}`}>
      <p className="zipper-copy">
        Keep the product confidential and take no photographs during the session.
      </p>

      <div
        ref={trackRef}
        className={`zipper-track${dragging ? ' is-dragging' : ''}`}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-valuetext={agreed ? 'Zipped — agreed to keep confidential' : 'Slide zipper to agree'}
        aria-label="Slide zipper closed to agree to confidentiality"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={onKeyDown}
      >
        <div className="zipper-teeth zipper-teeth-open" aria-hidden="true" />
        <div
          className="zipper-teeth zipper-teeth-closed"
          style={{ width: `${pct}%` }}
          aria-hidden="true"
        />
        <div className="zipper-hint" aria-hidden="true">
          {agreed ? 'Lips zipped' : 'Slide to keep it quiet →'}
        </div>
        <button
          type="button"
          className="zipper-pull"
          style={{ left: `calc(${pct}% - 18px)` }}
          disabled={disabled || agreed}
          aria-hidden="true"
          tabIndex={-1}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <span className="zipper-pull-tab" />
        </button>
      </div>

      {agreed ? (
        <p className="zipper-done">You’re in on the secret.</p>
      ) : (
        <p className="zipper-note">Zip closed to agree — then confirm below.</p>
      )}
    </div>
  )
}
