import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  PUPO_FRAME_MS,
  PUPO_FRAMES,
  PUPO_HEIGHT,
  PUPO_INTERLUDE_MS,
  PUPO_PALETTE,
  PUPO_WIDTH,
  pupoFrameIndex,
  pupoInterludes,
  type PupoFrame,
  type PupoInterlude,
  type PupoMood,
  type PupoState,
} from '@pulpo/client-core'

const PIXEL = 3

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

/** Pupo the pulpo, perched on the composer: thinks while the model reasons, pulls out its laptop, and types while it answers. */
export function PupoBuddy({ mood, className }: { mood: PupoState; className?: string }) {
  // Queue the one-shot moods between states (pulling out the laptop, celebrating a finished answer);
  // adjusting state during render avoids an extra effect pass.
  const [previousMood, setPreviousMood] = useState(mood)
  const [interludes, setInterludes] = useState<PupoInterlude[]>([])
  if (mood !== previousMood) {
    setPreviousMood(mood)
    setInterludes(pupoInterludes(previousMood, mood))
  }
  useEffect(() => {
    const interlude = interludes[0]
    if (!interlude) return
    const timeout = window.setTimeout(() => setInterludes((queue) => queue.slice(1)), PUPO_INTERLUDE_MS[interlude])
    return () => window.clearTimeout(timeout)
  }, [interludes])

  const shown: PupoMood = interludes[0] ?? mood
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
  const index = reducedMotion ? 0 : pupoFrameIndex(shown, tick)
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
