import { useEffect, useRef, useState } from 'react'
import { useRive } from '@rive-app/react-canvas'
import { RIV_SRC, RIVE_IDLE, RIVE_INTRO } from './riveBall'

type Props = {
  onIntroDone: () => void
  onFailed: () => void
}

/** Loaded only when public/pickleball.riv exists (code-split). */
export function RiveIntroBall({ onIntroDone, onFailed }: Props) {
  const done = useRef(false)
  const [gone, setGone] = useState(false)
  const { rive, RiveComponent } = useRive({
    src: RIV_SRC,
    animations: RIVE_INTRO,
    autoplay: true,
    onLoadError: () => {
      onFailed()
    },
  })

  useEffect(() => {
    if (!rive) return
    rive.play(RIVE_INTRO)
    const unlock = window.setTimeout(() => {
      if (!done.current) {
        done.current = true
        onIntroDone()
      }
      rive.play(RIVE_IDLE)
    }, 900)
    const hide = window.setTimeout(() => setGone(true), 4800)
    return () => {
      window.clearTimeout(unlock)
      window.clearTimeout(hide)
    }
  }, [rive, onIntroDone])

  if (gone) return null

  return (
    <div className="bounce-ball bounce-ball--rive" aria-hidden="true">
      <RiveComponent className="bounce-rive-canvas" />
    </div>
  )
}
