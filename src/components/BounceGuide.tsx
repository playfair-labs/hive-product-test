import { useEffect, useRef, useState, type RefObject } from 'react'
import { Pickleball } from './Pickleball'

type Phase = 'launch' | 'words' | 'scroll' | 'hidden'

type Props = {
  /** When true, start the bounce sequence */
  active: boolean
  /** Skip animations */
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
  const [bounceClass, setBounceClass] = useState('')
  const doneRef = useRef(false)

  // Start sequence
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
    // Start near top centre (logo / envelope exit)
    const cr = container.getBoundingClientRect()
    setPos({ x: cr.width / 2, y: 120 })

    let cancelled = false
    const words = () => (wordRefs.current || []).filter(Boolean) as HTMLElement[]

    async function run() {
      await wait(280)
      if (cancelled) return
      setPhase('words')
      const list = words()
      for (let i = 0; i < list.length; i++) {
        if (cancelled) return
        const el = list[i]!
        const target = centerOf(el, container!)
        // Arc up then land
        setBounceClass('is-flying')
        setPos({ x: target.x, y: target.y - 56 })
        await wait(220)
        if (cancelled) return
        setPos({ x: target.x, y: target.y - 8 })
        setBounceClass('is-landing')
        el.classList.add('word-hit')
        await wait(320)
        el.classList.remove('word-hit')
        setBounceClass('')
        await wait(80)
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

  // Scroll: follow active section heading
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
        setPos({ x: next.x, y: next.y - 6 })
        setBounceClass('is-scroll-hop')
        window.setTimeout(() => setBounceClass(''), 400)
      },
      { root: null, threshold: [0.35, 0.55, 0.75], rootMargin: '-15% 0px -45% 0px' },
    )

    targets().forEach((el) => io.observe(el))

    // Initial park on first heading or hero title
    const first = targets()[0]
    if (first) {
      const next = centerOf(first, container)
      setPos({ x: next.x, y: next.y - 6 })
    }

    return () => io.disconnect()
  }, [phase, visible, containerRef])

  if (!visible) return null

  return (
    <div
      className={`bounce-ball ${bounceClass}`}
      style={{
        transform: `translate(${pos.x}px, ${pos.y}px) translate(-50%, -50%)`,
      }}
      aria-hidden="true"
    >
      <Pickleball size={phase === 'scroll' ? 40 : 52} />
    </div>
  )
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}
