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
 * Intro ball after envelope: prefer Rive (intro → idle), CSS PNG fallback.
 * Regenerate via Rive MCP sit / export to public/pickleball.riv
 */
export function BounceGuide({ active, reducedMotion, onIntroDone }: Props) {
  const [mode, setMode] = useState<Mode>('pending')

  useEffect(() => {
    if (!active) return
    if (reducedMotion) {
      onIntroDone()
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
  }, [active, reducedMotion, onIntroDone])

  if (!active || mode === 'pending') return null
  if (reducedMotion) return null

  if (mode === 'rive') {
    return (
      <Suspense fallback={null}>
        <RiveIntroBall
          onIntroDone={onIntroDone}
          onFailed={() => setMode('css')}
        />
      </Suspense>
    )
  }

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
