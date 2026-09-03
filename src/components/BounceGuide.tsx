import { useEffect, useState } from 'react'
import { Pickleball } from './Pickleball'

type Props = {
  active: boolean
  reducedMotion: boolean
  onIntroDone: () => void
}

/**
 * Lightweight intro ball: one CSS bounce + short idle, then fade.
 * PNG Pickleball only — reliable on Mac Safari and iPhone.
 */
export function BounceGuide({ active, reducedMotion, onIntroDone }: Props) {
  useEffect(() => {
    if (!active || !reducedMotion) return
    onIntroDone()
  }, [active, reducedMotion, onIntroDone])

  if (!active || reducedMotion) return null

  return <CssIntroBall onIntroDone={onIntroDone} />
}

function CssIntroBall({ onIntroDone }: { onIntroDone: () => void }) {
  const [phase, setPhase] = useState<'intro' | 'idle' | 'gone'>('intro')

  useEffect(() => {
    const unlock = window.setTimeout(onIntroDone, 720)
    const toIdle = window.setTimeout(() => setPhase('idle'), 900)
    const toGone = window.setTimeout(() => setPhase('gone'), 4800)
    return () => {
      window.clearTimeout(unlock)
      window.clearTimeout(toIdle)
      window.clearTimeout(toGone)
    }
  }, [onIntroDone])

  if (phase === 'gone') return null

  return (
    <div className={`bounce-ball bounce-ball--css is-${phase}`} aria-hidden="true">
      <div className="bounce-ball-motion">
        <Pickleball size={72} className="bounce-ball-spin" />
      </div>
    </div>
  )
}
