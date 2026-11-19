import { useEffect, useMemo, useState } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { PUPO_FRAME_MS, PUPO_FRAMES, PUPO_HEIGHT, PUPO_PALETTE, PUPO_WIDTH, type PupoFrame, type PupoMood } from '@pulpo/client-core';

export const PUPO_PIXEL = 3;
const HAPPY_MS = 1600;

function frameRects(frame: PupoFrame) {
  return frame.flatMap((layer, index) => layer.sprite.flatMap((row, y) => [...row].flatMap((pixel, x) => pixel === '.'
    ? []
    : [<Rect key={`${index}:${x},${y}`} x={layer.x + x} y={layer.y + y} width={1.02} height={1.02} fill={PUPO_PALETTE[pixel]} />])));
}

/** Pupo the pulpo, perched on the composer: scratches its head while the model thinks and types while it answers. */
export function PupoBuddy({ mood, reduceMotion, style }: {
  mood: Exclude<PupoMood, 'happy'>;
  reduceMotion: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  // Celebrate briefly when an answer finishes; adjusting state during render avoids an extra effect pass.
  const [previousMood, setPreviousMood] = useState(mood);
  const [celebrating, setCelebrating] = useState(false);
  if (mood !== previousMood) {
    setPreviousMood(mood);
    setCelebrating(previousMood === 'typing' && mood === 'idle');
  }
  useEffect(() => {
    if (!celebrating) return;
    const timeout = setTimeout(() => setCelebrating(false), HAPPY_MS);
    return () => clearTimeout(timeout);
  }, [celebrating]);

  const shown: PupoMood = celebrating ? 'happy' : mood;
  // Ticks are tagged with their mood so a new mood starts from its first frame.
  const [animation, setAnimation] = useState({ mood: shown, tick: 0 });
  useEffect(() => {
    if (reduceMotion) return;
    const interval = setInterval(() => setAnimation((current) => current.mood === shown
      ? { mood: shown, tick: current.tick + 1 }
      : { mood: shown, tick: 1 }), PUPO_FRAME_MS[shown]);
    return () => clearInterval(interval);
  }, [shown, reduceMotion]);
  const tick = animation.mood === shown ? animation.tick : 0;

  const frames = PUPO_FRAMES[shown];
  const index = reduceMotion ? 0 : tick % frames.length;
  const rects = useMemo(() => frameRects(frames[index]), [frames, index]);

  return (
    <Svg
      testID="pupo-buddy"
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      width={PUPO_WIDTH * PUPO_PIXEL}
      height={PUPO_HEIGHT * PUPO_PIXEL}
      viewBox={`0 0 ${PUPO_WIDTH} ${PUPO_HEIGHT}`}
      style={style}
    >
      {rects}
    </Svg>
  );
}
