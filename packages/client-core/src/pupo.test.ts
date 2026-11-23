import { describe, expect, it } from 'vitest'
import { PUPO_FRAMES, PUPO_HEIGHT, PUPO_WIDTH, pupoFrameIndex, pupoInterludes, pupoMoodForMessage } from './pupo.js'

describe('Pupo buddy', () => {
  it('thinks while reasoning or calling tools and types once answer text streams', () => {
    expect(pupoMoodForMessage(null)).toBe('idle')
    expect(pupoMoodForMessage({ content: '' })).toBe('thinking')
    expect(pupoMoodForMessage({ content: 'Hi' })).toBe('typing')
    expect(pupoMoodForMessage({ content: '', outputItems: [{ type: 'reasoning' }] })).toBe('thinking')
    expect(pupoMoodForMessage({ content: 'Let me check.', outputItems: [{ type: 'message' }, { type: 'function_call' }] })).toBe('thinking')
    expect(pupoMoodForMessage({ content: 'Done', outputItems: [{ type: 'reasoning' }, { type: 'message' }] })).toBe('typing')
  })

  it('pulls the laptop out before typing and puts it away after', () => {
    expect(pupoInterludes('thinking', 'typing')).toEqual(['unpack'])
    expect(pupoInterludes('idle', 'typing')).toEqual(['unpack'])
    expect(pupoInterludes('typing', 'thinking')).toEqual(['pack'])
    expect(pupoInterludes('typing', 'idle')).toEqual(['pack', 'happy'])
    expect(pupoInterludes('idle', 'thinking')).toEqual([])
    expect(pupoFrameIndex('unpack', 99)).toBe(PUPO_FRAMES.unpack.length - 1)
    expect(pupoFrameIndex('typing', 3)).toBe(1)
  })

  it('paints every frame inside the scene', () => {
    for (const frames of Object.values(PUPO_FRAMES)) for (const frame of frames) for (const layer of frame) {
      layer.sprite.forEach((row, y) => [...row].forEach((pixel, x) => {
        if (pixel === '.') return
        expect(layer.x + x).toBeGreaterThanOrEqual(0)
        expect(layer.x + x).toBeLessThan(PUPO_WIDTH)
        expect(layer.y + y).toBeGreaterThanOrEqual(0)
        expect(layer.y + y).toBeLessThan(PUPO_HEIGHT)
      }))
    }
  })
})
