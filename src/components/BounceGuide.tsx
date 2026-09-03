import { useEffect, useRef, useState, type RefObject } from 'react'
import { Pickleball } from './Pickleball'

type Phase = 'launch' | 'words' | 'scroll' | 'hidden'

type Props = {
  active: boolean
  reducedMotion: boolean
  wordRefs: RefObject<(HTMLElement | null)[]>
  containerRef: RefObject<HTMLElement | null>
  onWordBounceDone: () => void
}

type Pos = { x: number; y: number }

function centerOf(el: HTMLElement, container: HTMLElement): Pos {
  const er = el.getBoundingClientRect()
  const cr = container.getBoundingClientRect()
  return {
    x: er.left - cr.left + er.width / 2,
    y: er.top - cr.top + er.height / 2,
  }
}

export function BounceGuide({
  active,
  reducedMotion,
  wordRefs,
  containerRef,
  onWordBounceDone,
}: Props) {
  const [phase, setPhase] = useState<Phase>('hidden')
  const [pos, setPos] = useState<Pos>({ x: 0, y: 0 })
  const [visible, setVisible] = useState(false)
  const [spin, setSpin] = useState(0)
  const [squashed, setSquashed] = useState(false)
  const [flyClass, setFlyClass] = useState('')
  const doneRef = useRef(false)
  const spinRef = useRef(0)

  useEffect(() => {
    if (!active) return
    const container = containerRef.current
    if (!container) return

    if (reducedMotion) {
      doneRef.current = true
      onWordBounceDone()
      setPhase('scroll')
      setVisible(true)
      return
    }

    setPhase('launch')
    setVisible(true)
    const cr = container.getBoundingClientRect()
    setPos({ x: cr.width / 2, y: 110 })

    let cancelled = false
    const words = () => (wordRefs.current || []).filter(Boolean) as HTMLElement[]

    function addSpin(delta: number) {
      spinRef.current += delta
      setSpin(spinRef.current)
    }

    async function hopTo(el: HTMLElement) {
      const target = centerOf(el, container!)
      // Rise with spin
      setFlyClass('is-rising')
      setSquashed(false)
      setPos({ x: target.x, y: target.y - 72 })
      addSpin(140)
      await wait(260)
      if (cancelled) return
      // Fall (faster)
      setFlyClass('is-falling')
      addSpin(200)
      setPos({ x: target.x, y: target.y - 6 })
      await wait(200)
      if (cancelled) return
      // Squash + word hit
      setFlyClass('is-impact')
      setSquashed(true)
      el.classList.add('word-hit')
      await wait(90)
      if (cancelled) return
      // Small rebound
      setSquashed(false)
      setFlyClass('is-rising')
      setPos({ x: target.x, y: target.y - 22 })
      addSpin(60)
      await wait(140)
      if (cancelled) return
      setFlyClass('is-falling')
      setPos({ x: target.x, y: target.y - 6 })
      await wait(160)
      el.classList.remove('word-hit')
      setFlyClass('')
      setSquashed(false)
    }

    async function run() {
      await wait(200)
      if (cancelled) return
      setPhase('words')
      const list = words()
      for (let i = 0; i < list.length; i++) {
        if (cancelled) return
        await hopTo(list[i]!)
        await wait(60)
      }
      if (cancelled) return
      if (!doneRef.current) {
        doneRef.current = true
        onWordBounceDone()
      }
      setPhase('scroll')
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [active, reducedMotion, containerRef, wordRefs, onWordBounceDone])

  useEffect(() => {
    if (phase !== 'scroll' || !visible) return
    const container = containerRef.current
    if (!container) return

    const targets = () =>
      Array.from(container.querySelectorAll<HTMLElement>('[data-ball-target]'))

    const io = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        const best = visibleEntries[0]?.target as HTMLElement | undefined
        if (!best) return
        const next = centerOf(best, container)
        setFlyClass('is-scroll-hop')
        setSpin((s) => s + 90)
        setPos({ x: next.x, y: next.y - 6 })
        window.setTimeout(() => setFlyClass(''), 450)
      },
      { root: null, threshold: [0.35, 0.55, 0.75], rootMargin: '-15% 0px -45% 0px' },
    )

    targets().forEach((el) => io.observe(el))
    const first = targets()[0]
    if (first) {
      const next = centerOf(first, container)
      setPos({ x: next.x, y: next.y - 6 })
    }

    return () => io.disconnect()
  }, [phase, visible, containerRef])

  if (!visible) return null

  const size = phase === 'scroll' ? 44 : 58

  return (
    <div
      className={`bounce-ball ${flyClass}`}
      style={{
        transform: `translate(${pos.x}px, ${pos.y}px) translate(-50%, -50%)`,
      }}
      aria-hidden="true"
    >
      <Pickleball size={size} spinDeg={spin} squashed={squashed} />
    </div>
  )
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}
