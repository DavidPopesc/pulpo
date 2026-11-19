// Renders Pupo (the pixel-art pulpo from @pulpo/client-core) into every app icon, logo, and favicon.
// Output keeps the old smiley file names and pixel sizes so nothing that references them changes.
//
//   node --experimental-strip-types assets/render-pupo-icons.ts
//
// Needs macOS for `iconutil` (desktop .icns).
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'
import { PUPO_FRAMES, PUPO_PALETTE } from '../packages/client-core/src/pupo.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
/** The dark tile behind the opaque app icons, unchanged from the smiley icons. */
const ICON_BACKGROUND = [16, 16, 20] as const

type Layer = 'full' | 'noface' | 'face'

// The idle pose, cropped to the rows that hold pixels.
const SPRITE = PUPO_FRAMES.idle[0]![0]!.sprite.filter((row) => row.includes('3'))
const ART_W = SPRITE[0]!.length
const ART_H = SPRITE.length
// Eyes and mouth: ink pixels inside the head, away from its outline.
const isFace = (x: number, y: number) => SPRITE[y]![x] === '3' && y >= 4 && y <= 9 && x >= 4 && x <= 11

function hex(color: string): [number, number, number] {
  return [1, 3, 5].map((index) => Number.parseInt(color.slice(index, index + 2), 16)) as [number, number, number]
}

function artColor(x: number, y: number, layer: Layer): [number, number, number] | null {
  const pixel = SPRITE[y]?.[x]
  if (!pixel || pixel === '.') return null
  const face = isFace(x, y)
  if (layer === 'face') return face ? hex(PUPO_PALETTE['3']!) : null
  if (layer === 'noface' && face) return hex(PUPO_PALETTE['1']!)
  return hex(PUPO_PALETTE[pixel]!)
}

interface RenderOptions {
  /** Share of the canvas width Pupo spans; the art pixel size rounds down to whole pixels. */
  fill: number
  layer?: Layer
  background?: readonly [number, number, number]
  /** Draw the background as a macOS-style rounded tile inset from the edges. */
  tile?: boolean
}

function render(size: number, { fill, layer = 'full', background, tile = false }: RenderOptions): Buffer {
  const rgba = Buffer.alloc(size * size * 4)
  if (background) {
    const inset = tile ? Math.round(size * 100 / 1024) : 0
    const side = size - inset * 2
    const radius = tile ? side * 0.225 : 0
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const coverage = tile ? tileCoverage(x + 0.5 - inset, y + 0.5 - inset, side, radius) : 1
      if (coverage <= 0) continue
      const offset = (y * size + x) * 4
      rgba[offset] = background[0]; rgba[offset + 1] = background[1]; rgba[offset + 2] = background[2]
      rgba[offset + 3] = Math.round(coverage * 255)
    }
  }
  const pixel = Math.max(1, Math.floor(size * fill / ART_W))
  const left = Math.floor((size - ART_W * pixel) / 2)
  const top = Math.floor((size - ART_H * pixel) / 2)
  for (let y = 0; y < ART_H; y++) for (let x = 0; x < ART_W; x++) {
    const color = artColor(x, y, layer)
    if (!color) continue
    for (let dy = 0; dy < pixel; dy++) {
      const row = top + y * pixel + dy
      if (row < 0 || row >= size) continue
      for (let dx = 0; dx < pixel; dx++) {
        const column = left + x * pixel + dx
        if (column < 0 || column >= size) continue
        const offset = (row * size + column) * 4
        rgba[offset] = color[0]; rgba[offset + 1] = color[1]; rgba[offset + 2] = color[2]; rgba[offset + 3] = 255
      }
    }
  }
  return background && !tile ? png(size, rgba, false) : png(size, rgba, true)
}

/** Antialiased coverage of a rounded square at (x, y). */
function tileCoverage(x: number, y: number, side: number, radius: number): number {
  const dx = Math.max(radius - x, x - (side - radius), 0)
  const dy = Math.max(radius - y, y - (side - radius), 0)
  const outside = Math.hypot(dx, dy) - radius
  const edge = Math.min(x, y, side - x, side - y)
  return Math.max(0, Math.min(1, dx > 0 && dy > 0 ? 0.5 - outside : edge + 0.5))
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
function crc32(data: Buffer): number {
  let crc = 0xffffffff
  for (const byte of data) crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}
function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4); length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}
/** Encodes RGBA pixels as a PNG; opaque images drop the alpha channel like the old icons. */
function png(size: number, rgba: Buffer, alpha: boolean): Buffer {
  const channels = alpha ? 4 : 3
  const raw = Buffer.alloc((size * channels + 1) * size)
  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * channels + 1)
    for (let x = 0; x < size; x++) for (let c = 0; c < channels; c++) {
      raw[rowStart + 1 + x * channels + c] = rgba[(y * size + x) * 4 + c]!
    }
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0); header.writeUInt32BE(size, 4)
  header[8] = 8; header[9] = alpha ? 6 : 2
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/** A Windows .ico holding PNG images. */
function ico(images: Array<{ size: number; data: Buffer }>): Buffer {
  const header = Buffer.alloc(6 + images.length * 16)
  header.writeUInt16LE(1, 2); header.writeUInt16LE(images.length, 4)
  let offset = header.length
  images.forEach(({ size, data }, index) => {
    const entry = 6 + index * 16
    header[entry] = size >= 256 ? 0 : size; header[entry + 1] = size >= 256 ? 0 : size
    header.writeUInt16LE(1, entry + 4); header.writeUInt16LE(32, entry + 6)
    header.writeUInt32LE(data.length, entry + 8); header.writeUInt32LE(offset, entry + 12)
    offset += data.length
  })
  return Buffer.concat([header, ...images.map((image) => image.data)])
}

function write(path: string, data: Buffer) {
  writeFileSync(join(ROOT, path), data)
  console.log(`${path} (${data.length.toLocaleString()} bytes)`)
}

// Small marks fill their canvas so each art pixel lands on whole screen pixels.
const mark = (size: number, fill = size <= 48 ? 1 : 0.875) => render(size, { fill })

// Logos shown in the apps.
write('apps/web/public/pulpo-smiley.png', mark(256))
write('apps/mobile/src/mockup5/assets/pulpo-smiley.png', mark(256))
write('apps/keyboard-ios/App/Assets.xcassets/PulpoSmiley.imageset/pulpo-smiley.png', mark(256))
write('apps/web/public/favicon.ico', ico([16, 32, 48].map((size) => ({ size, data: mark(size) }))))

// App icons and launch screens. Android's adaptive foreground keeps to the 66% safe zone.
const appIcon = render(1024, { fill: 0.7, background: ICON_BACKGROUND })
write('apps/mobile/assets/pulpo-app-icon.png', appIcon)
write('apps/keyboard-ios/App/Assets.xcassets/AppIcon.appiconset/AppIcon.png', appIcon)
write('apps/mobile/assets/pulpo-smiley.png', render(1024, { fill: 0.6 }))
write('apps/mobile/assets/pulpo-splash.png', mark(1024))

// Icon Composer layers: Pupo without its face, and the face alone (rendered with glass).
for (const [directory, size] of [
  ['assets/highres', 8192],
  ['apps/mobile/assets', 8192],
  ['apps/mobile/assets/Pulpo.icon/Assets', 8192],
  ['apps/mobile/assets/PulpoKeyboard.icon/Assets', 2048],
  ['assets/typewriter/layers', 2048],
] as const) {
  write(`${directory}/pulpo-smiley-noface.png`, render(size, { fill: 0.875, layer: 'noface' }))
  write(`${directory}/pulpo-smiley-justface.png`, render(size, { fill: 0.875, layer: 'face' }))
}
write('assets/highres/pulpo-smiley.png', render(8192, { fill: 0.875 }))

// Desktop: Windows .ico and the macOS .icns rounded tile.
write('apps/desktop/assets/Pulpo.ico', ico([16, 24, 32, 48, 64, 128, 256].map((size) => ({ size, data: mark(size) }))))
const iconset = join(mkdtempSync(join(tmpdir(), 'pupo-')), 'Pulpo.iconset')
mkdirSync(iconset)
for (const size of [16, 32, 128, 256, 512]) {
  for (const scale of [1, 2]) {
    const pixels = size * scale
    writeFileSync(join(iconset, `icon_${size}x${size}${scale === 2 ? '@2x' : ''}.png`),
      render(pixels, { fill: 0.6, background: ICON_BACKGROUND, tile: true }))
  }
}
execFileSync('iconutil', ['-c', 'icns', iconset, '-o', join(ROOT, 'apps/desktop/assets/Pulpo.icns')])
console.log('apps/desktop/assets/Pulpo.icns')
rmSync(dirname(iconset), { recursive: true, force: true })
