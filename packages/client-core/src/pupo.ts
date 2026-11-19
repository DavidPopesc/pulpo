// Pupo, the chat buddy that perches on the composer (web and mobile).
// "Original 4 · even" design from the Tomagochi-like Character project.
// Pixels: '.' transparent, '1' light, '2' mid, '3' ink, '4' laptop, '5' laptop edge, '6' laptop logo, '0' bubble.

export type PupoMood = 'idle' | 'thinking' | 'typing' | 'happy'

export const PUPO_PALETTE: Record<string, string> = {
  '1': '#d7b8f5',
  '2': '#9a5fd6',
  '3': '#3d1766',
  '4': '#c9ccd3',
  '5': '#5b5f6b',
  '6': '#f4f5f7',
  '0': '#ffffff',
}

export const PUPO_WIDTH = 22
export const PUPO_HEIGHT = 22
// Where the 16x16 Pupo sits inside the scene; the space above and to the right holds the thought bubble.
// The sprite's last row is always empty, so the feet land on the scene's bottom edge.
const BODY_X = 0
const BODY_Y = 7

const BLANK_EYES = '..311111111113..'

const IDLE = [
  '................',
  '.....333333.....',
  '....31111113....',
  '...3111111113...',
  '..311111111113..',
  '..311111111113..',
  '..311311113113..',
  '..311311113113..',
  '..311111111113..',
  '..311113311113..',
  '..311111111113..',
  '.31111111111113.',
  '3113311331133113',
  '3113311331133113',
  '.33..33..33..33.',
  '................',
]

const BLINK = IDLE.map((row, y) => y === 6 ? BLANK_EYES : y === 7 ? '..313331133313..' : row)

// Body lifted a row with the legs stretched to stay on the ground.
const HOP = [...IDLE.slice(1, 13), ...IDLE.slice(12, 13), ...IDLE.slice(14)]

const HAPPY = IDLE.map((row, y) => ({
  7: '..313131131313..',
  9: '..311133331113..',
  10: '..311132231113..',
  11: '.31111133111113.',
} as Record<number, string>)[y] ?? row)

/** Body with the eyes moved to the given rows/columns. */
function lookAt(eyeRows: [number, number], eyeCols: [number, number], mouth?: string): string[] {
  return IDLE.map((row, y) => {
    if (y === 9 && mouth) return mouth
    if (y !== 6 && y !== 7 && !eyeRows.includes(y)) return row
    const chars = [...(y === 6 || y === 7 ? BLANK_EYES : row)]
    if (eyeRows.includes(y)) for (const x of eyeCols) chars[x] = '3'
    return chars.join('')
  })
}

const LOOK_DOWN = lookAt([7, 8], [5, 10])

const LAPTOP = [
  '55555555555555',
  '54444444444445',
  '54444466444445',
  '55555555555555',
]
const LAPTOP_BASE = ['5555555555555555']
const HAND = ['.33.', '3223', '3223']

// Thinking, from the Tomagochi project: eyes up and away, a "hmm" mouth, and the far-right leg
// lifted across the body to tap the chin.
const THINK_TAP = [
  '................',
  '.....333333.....',
  '....31111113....',
  '...3111111113...',
  '..311111111113..',
  '..313111131113..',
  '..313111131113..',
  '..311111311113..',
  '..311113133113..',
  '..313313111333..',
  '..311111311113..',
  '.31111111331113.',
  '31133113311333..',
  '311331133113....',
  '.33..33..33.....',
  '................',
]
const THINK_REST = THINK_TAP.map((row, y) => (y === 7 ? '..311111111113..' : y === 8 ? '..311111333113..' : row))
// A thought bubble above Pupo's head whose dots count up.
const bubble = (dots: number) => [
  '..333333333.',
  '.30000000003',
  ['.30300000003', '.30300300003', '.30300300303'][dots - 1]!,
  '.30000000003',
  '..333333333.',
  '.33.........',
  '3...........',
]

export interface PupoLayer {
  sprite: string[]
  x: number
  y: number
}

export type PupoFrame = PupoLayer[]

const body = (sprite: string[]): PupoLayer => ({ sprite, x: BODY_X, y: BODY_Y })

const typing = (leftUp: boolean): PupoFrame => [
  body(LOOK_DOWN),
  { sprite: HAND, x: BODY_X + 1, y: BODY_Y + (leftUp ? 7 : 8) },
  { sprite: HAND, x: BODY_X + 11, y: BODY_Y + (leftUp ? 8 : 7) },
  { sprite: LAPTOP, x: BODY_X + 1, y: BODY_Y + 10 },
  { sprite: LAPTOP_BASE, x: BODY_X, y: BODY_Y + 14 },
]

// The pose holds for three ticks while the bubble's dots step every two.
const thinking = (tick: number): PupoFrame => [
  body(tick < 3 ? THINK_TAP : THINK_REST),
  { sprite: bubble(1 + Math.floor(tick / 2)), x: BODY_X + 10, y: BODY_Y - 7 },
]

export const PUPO_FRAMES: Record<PupoMood, PupoFrame[]> = {
  idle: [IDLE, IDLE, IDLE, IDLE, IDLE, BLINK, IDLE, IDLE, IDLE, IDLE, IDLE, IDLE, IDLE, HOP, IDLE, IDLE, IDLE, BLINK, IDLE, IDLE]
    .map((sprite) => [body(sprite)]),
  thinking: [0, 1, 2, 3, 4, 5].map(thinking),
  typing: [typing(true), typing(false)],
  happy: [[body(HAPPY)], [body(HOP)]],
}

export const PUPO_FRAME_MS: Record<PupoMood, number> = {
  idle: 300,
  thinking: 300,
  typing: 140,
  happy: 220,
}

/** Thinking while reasoning or using tools; typing once the latest output is answer text. */
export function pupoMoodForMessage(message: { content: string; outputItems?: unknown[] } | null | undefined): Exclude<PupoMood, 'happy'> {
  if (!message) return 'idle'
  const last = message.outputItems?.at(-1) as { type?: unknown } | undefined
  if (last && typeof last.type === 'string') return last.type === 'message' ? 'typing' : 'thinking'
  return message.content.trim() ? 'typing' : 'thinking'
}
