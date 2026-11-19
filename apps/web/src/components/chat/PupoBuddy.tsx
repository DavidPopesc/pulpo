import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { PUPO_FRAME_MS, PUPO_FRAMES, PUPO_HEIGHT, PUPO_PALETTE, PUPO_WIDTH, type PupoFrame, type PupoMood } from '@pulpo/client-core'

const PIXEL = 3
const HAPPY_MS = 1600

function frameRects(frame: PupoFrame) {
  return frame.flatMap((layer, index) => layer.sprite.flatMap((row, y) => [...row].flatMap((pixel, x) => pixel === '.'
    ? []
    : [<rect key={`${index}:${x},${y}`} x={layer.x + x} y={layer.y + y} width={1.02} height={1.02} fill={PUPO_PALETTE[pixel]} />])))
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!query) return
    const update = () => setReduced(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return reduced
}

/** Pupo the pulpo, perched on the composer: thinks while the model reasons and types while it answers. */
export function PupoBuddy({ mood, className }: { mood: Exclude<PupoMood, 'happy'>; className?: string }) {
  // Celebrate briefly when an answer finishes; adjusting state during render avoids an extra effect pass.
  const [previousMood, setPreviousMood] = useState(mood)
  const [celebrating, setCelebrating] = useState(false)
  if (mood !== previousMood) {
    setPreviousMood(mood)
    setCelebrating(previousMood === 'typing' && mood === 'idle')
  }
  useEffect(() => {
    if (!celebrating) return
    const timeout = window.setTimeout(() => setCelebrating(false), HAPPY_MS)
    return () => window.clearTimeout(timeout)
  }, [celebrating])

  const shown: PupoMood = celebrating ? 'happy' : mood
  const reducedMotion = usePrefersReducedMotion()
  // Ticks are tagged with their mood so a new mood starts from its first frame.
  const [animation, setAnimation] = useState({ mood: shown, tick: 0 })
  useEffect(() => {
    if (reducedMotion) return
    const interval = window.setInterval(() => setAnimation((current) => current.mood === shown
      ? { mood: shown, tick: current.tick + 1 }
      : { mood: shown, tick: 1 }), PUPO_FRAME_MS[shown])
    return () => window.clearInterval(interval)
  }, [shown, reducedMotion])
  const tick = animation.mood === shown ? animation.tick : 0

  const frames = PUPO_FRAMES[shown]
  const index = reducedMotion ? 0 : tick % frames.length
  const rects = useMemo(() => frameRects(frames[index]), [frames, index])

  return (
    <svg
      aria-hidden="true"
      data-mood={shown}
      width={PUPO_WIDTH * PIXEL}
      height={PUPO_HEIGHT * PIXEL}
      viewBox={`0 0 ${PUPO_WIDTH} ${PUPO_HEIGHT}`}
      shapeRendering="crispEdges"
      className={cn('pointer-events-none select-none', className)}
    >
      {rects}
    </svg>
  )
}
