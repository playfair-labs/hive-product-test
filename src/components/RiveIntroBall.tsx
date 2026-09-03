import { useEffect, useRef } from 'react'
import { useRive, useStateMachineInput } from '@rive-app/react-canvas'
import { RIV_SRC, RIVE_PLAY_INPUT, RIVE_STATE_MACHINE } from './riveBall'

type Props = {
  onIntroDone: () => void
}

/** Loaded only when public/pickleball.riv exists (code-split). */
export function RiveIntroBall({ onIntroDone }: Props) {
  const done = useRef(false)
  const { rive, RiveComponent } = useRive({
    src: RIV_SRC,
    stateMachine: RIVE_STATE_MACHINE,
    autoplay: true,
    onLoadError: () => {
      if (!done.current) {
        done.current = true
        onIntroDone()
      }
    },
  })

  const play = useStateMachineInput(rive, RIVE_STATE_MACHINE, RIVE_PLAY_INPUT)

  useEffect(() => {
    if (!play) return
    // Rive StateMachineInput is intentionally mutated to drive the machine
    const input = play as { value: boolean | number }
    input.value = true
  }, [play])

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (!done.current) {
        done.current = true
        onIntroDone()
      }
    }, 900)
    return () => window.clearTimeout(t)
  }, [onIntroDone])

  return (
    <div className="bounce-ball bounce-ball--rive" aria-hidden="true">
      <RiveComponent className="bounce-rive-canvas" />
    </div>
  )
}
