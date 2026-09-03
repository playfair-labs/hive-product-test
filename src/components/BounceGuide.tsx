import { lazy, Suspense, useEffect, useState } from 'react'
import { Pickleball } from './Pickleball'
import { RIV_SRC } from './riveBall'

type Props = {
  active: boolean
  reducedMotion: boolean
  onIntroDone: () => void
}

type Mode = 'pending' | 'rive' | 'css'

const RiveIntroBall = lazy(() =>
  import('./RiveIntroBall').then((m) => ({ default: m.RiveIntroBall })),
)

/**
 * Lightweight intro ball: one bounce + short idle, then fade.
 * Prefer public/pickleball.riv (animations "intro" then "idle").
 * Falls back to CSS if the .riv is missing — Rive runtime is code-split.
 *
 * Regenerate: node scripts/generate-pickleball-riv.mjs
 */
export function BounceGuide({ active, reducedMotion, onIntroDone }: Props) {
  const [mode, setMode] = useState<Mode>('pending')

  useEffect(() => {
    if (!active) return
    if (reducedMotion) {
      setMode('css')
      return
    }
    let cancelled = false
    fetch(RIV_SRC)
      .then(async (res) => {
        if (cancelled) return
        if (!res.ok) {
          setMode('css')
          return
        }
        const ct = (res.headers.get('content-type') || '').toLowerCase()
        if (ct.includes('text/html') || ct.includes('text/plain')) {
          setMode('css')
          return
        }
        const buf = await res.arrayBuffer()
        if (cancelled) return
        setMode(buf.byteLength > 32 ? 'rive' : 'css')
      })
      .catch(() => {
        if (!cancelled) setMode('css')
      })
    return () => {
      cancelled = true
    }
  }, [active, reducedMotion])

  if (!active || mode === 'pending') return null

  if (mode === 'rive' && !reducedMotion) {
    return (
      <Suspense fallback={null}>
        <RiveIntroBall onIntroDone={onIntroDone} />
      </Suspense>
    )
  }

  return <CssIntroBall reducedMotion={reducedMotion} onIntroDone={onIntroDone} />
}

function CssIntroBall({
  reducedMotion,
  onIntroDone,
}: {
  reducedMotion: boolean
  onIntroDone: () => void
}) {
  const [phase, setPhase] = useState<'intro' | 'idle' | 'gone'>(
    reducedMotion ? 'gone' : 'intro',
  )

  useEffect(() => {
    if (reducedMotion) {
      onIntroDone()
      return
    }
    const unlock = window.setTimeout(onIntroDone, 720)
    const toIdle = window.setTimeout(() => setPhase('idle'), 900)
    const toGone = window.setTimeout(() => setPhase('gone'), 3800)
    return () => {
      window.clearTimeout(unlock)
      window.clearTimeout(toIdle)
      window.clearTimeout(toGone)
    }
  }, [reducedMotion, onIntroDone])

  if (phase === 'gone') return null

  return (
    <div className={`bounce-ball bounce-ball--css is-${phase}`} aria-hidden="true">
      <div className="bounce-ball-motion">
        <Pickleball size={56} className="bounce-ball-spin" />
      </div>
    </div>
  )
}
