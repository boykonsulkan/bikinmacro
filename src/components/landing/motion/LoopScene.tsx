'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'

export type SceneStep = { id: string; duration: number }

export type SceneFrame = {
  /** Waktu dalam loop (ms), 0 sampai total + hold. */
  t: number
  step: SceneStep
  stepIndex: number
  /** Berapa ms sejak langkah ini mulai. */
  stepT: number
  /** 0..1 progres di dalam langkah ini. */
  stepProgress: number
  /** Waktu mulai tiap langkah (ms), dicari lewat id. */
  start: Record<string, number>
  /** Total durasi semua langkah, tanpa jeda akhir. */
  total: number
  /** True saat di jeda akhir loop. */
  isHolding: boolean
}

type LoopSceneProps = {
  steps: SceneStep[]
  /** Jeda di frame akhir sebelum ulang (ms). */
  hold?: number
  /**
   * Waktu (ms) untuk frame statis sebelum animasi jalan (SSR, screenshot,
   * link preview). Default: frame akhir, karena itu yang paling informatif.
   */
  poster?: number
  /** Deskripsi teks untuk screen reader. Animasinya sendiri aria-hidden. */
  label: string
  className?: string
  /** Di desktop, putar ulang dari awal saat pointer masuk ke kartu induk. */
  replayOnHover?: boolean
  children: (frame: SceneFrame) => ReactNode
}

const reducedQuery = '(prefers-reduced-motion: reduce)'
const subscribeReduced = (cb: () => void) => {
  const mq = window.matchMedia(reducedQuery)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}
const getReduced = () => window.matchMedia(reducedQuery).matches
const getReducedServer = () => false

function buildFrame(steps: SceneStep[], hold: number, time: number): SceneFrame {
  const total = steps.reduce((sum, s) => sum + s.duration, 0)
  const start: Record<string, number> = {}
  let acc = 0
  for (const s of steps) {
    start[s.id] = acc
    acc += s.duration
  }
  const t = Math.min(Math.max(time, 0), total + hold)
  const isHolding = t >= total
  let stepIndex = steps.findIndex((s) => t < start[s.id] + s.duration)
  if (stepIndex === -1) stepIndex = steps.length - 1
  const step = steps[stepIndex]
  const stepT = Math.min(t - start[step.id], step.duration)
  return {
    t,
    step,
    stepIndex,
    stepT,
    stepProgress: stepT / step.duration,
    start,
    total,
    isHolding,
  }
}

export default function LoopScene({
  steps,
  hold = 1500,
  poster,
  label,
  className,
  replayOnHover = false,
  children,
}: LoopSceneProps) {
  const total = steps.reduce((sum, s) => sum + s.duration, 0)
  const rootRef = useRef<HTMLDivElement>(null)
  const clock = useRef(0)
  const [time, setTime] = useState(poster ?? total)
  const reduced = useSyncExternalStore(subscribeReduced, getReduced, getReducedServer)

  useEffect(() => {
    if (reduced) return
    const root = rootRef.current
    if (!root) return

    const loop = total + hold
    let inView = false
    let raf = 0
    let last: number | null = null

    const running = () => inView && !document.hidden

    const tick = (now: number) => {
      if (!running()) {
        raf = 0
        last = null
        return
      }
      if (last !== null) clock.current += Math.min(now - last, 100)
      last = now
      setTime(clock.current % loop)
      raf = requestAnimationFrame(tick)
    }
    const sync = () => {
      if (running() && !raf) raf = requestAnimationFrame(tick)
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting
        sync()
      },
      { threshold: 0.2 },
    )
    io.observe(root)
    document.addEventListener('visibilitychange', sync)

    // Replay saat hover kartu (hanya mouse, bukan sentuh).
    const host = root.closest<HTMLElement>('[data-replay-host]') ?? root
    const onEnter = (e: PointerEvent) => {
      if (replayOnHover && e.pointerType === 'mouse') clock.current = 0
    }
    host.addEventListener('pointerenter', onEnter)

    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', sync)
      host.removeEventListener('pointerenter', onEnter)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [reduced, total, hold, replayOnHover])

  const frame = buildFrame(steps, hold, reduced ? total : time)

  return (
    <div ref={rootRef} className={className}>
      <p className="sr-only">{label}</p>
      <div aria-hidden="true" className="h-full w-full">
        {children(frame)}
      </div>
    </div>
  )
}
