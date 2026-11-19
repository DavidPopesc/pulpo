// Pupo, the chat buddy that perches on the composer (web and mobile).
// "Original 4 · even" design from the Tomagochi-like Character project.
// Pixels: '.' transparent, '1' light, '2' mid, '3' ink, '4' laptop, '5' laptop edge, '6' laptop logo.

export type PupoMood = 'idle' | 'thinking' | 'typing' | 'happy'

export const PUPO_PALETTE: Record<string, string> = {
  '1': '#d7b8f5',
  '2': '#9a5fd6',
  '3': '#3d1766',
  '4': '#c9ccd3',
  '5': '#5b5f6b',
  '6': '#f4f5f7',
}

export const PUPO_WIDTH = 19
export const PUPO_HEIGHT = 17
// Where the 16x16 Pupo sits inside the scene; the free space up and to the left holds the scratching arm.
// The sprite's last row is always empty, so the feet land on the scene's bottom edge.
const BODY_X = 3
const BODY_Y = 2

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

const THINK_LEFT = lookAt([5, 6], [4, 9], '..311133111113..')
const THINK_UP = lookAt([5, 6], [5, 10], '..311133111113..')
const LOOK_DOWN = lookAt([7, 8], [5, 10])

const LAPTOP = [
  '55555555555555',
  '54444444444445',
  '54444466444445',
  '55555555555555',
]
const LAPTOP_BASE = ['5555555555555555']
const HAND = ['.33.', '3223', '3223']

// A tentacle curling up from Pupo's side to scratch the top of its head, in two strokes.
const SCRATCH_ARM_UP = [
  '.....3333...',
  '....312213..',
  '...3113333..',
  '..313.......',
  '.3113.......',
  '.313........',
  '.313........',
  '.3113.......',
  '..3113......',
]
const SCRATCH_ARM_DOWN = [
  '......3333..',
  '.....312213.',
  '...31113333.',
  '..313.......',
  '.3113.......',
  '.313........',
  '.313........',
  '.3113.......',
  '..3113......',
]
// Little scratch marks that flicker above the hand.
const SCRATCH_MARKS_A = ['3...3']
const SCRATCH_MARKS_B = ['..3..']

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

const scratching = (eyes: string[], down: boolean): PupoFrame => [
  body(eyes),
  { sprite: down ? SCRATCH_ARM_DOWN : SCRATCH_ARM_UP, x: BODY_X - 3, y: BODY_Y },
  { sprite: down ? SCRATCH_MARKS_B : SCRATCH_MARKS_A, x: BODY_X + 2, y: BODY_Y - 1 },
]

export const PUPO_FRAMES: Record<PupoMood, PupoFrame[]> = {
  idle: [IDLE, IDLE, IDLE, IDLE, IDLE, BLINK, IDLE, IDLE, IDLE, IDLE, IDLE, IDLE, IDLE, HOP, IDLE, IDLE, IDLE, BLINK, IDLE, IDLE]
    .map((sprite) => [body(sprite)]),
  thinking: [
    scratching(THINK_UP, false),
    scratching(THINK_UP, true),
    scratching(THINK_UP, false),
    scratching(THINK_UP, true),
    scratching(THINK_LEFT, false),
    scratching(THINK_LEFT, true),
    scratching(THINK_LEFT, false),
    scratching(BLINK, true),
  ],
  typing: [typing(true), typing(false)],
  happy: [[body(HAPPY)], [body(HOP)]],
}

export const PUPO_FRAME_MS: Record<PupoMood, number> = {
  idle: 300,
  thinking: 200,
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
