import { describe, expect, it } from 'vitest'
import { PUPO_FRAMES, PUPO_HEIGHT, PUPO_WIDTH, pupoMoodForMessage } from './pupo-sprites'

describe('Pupo buddy', () => {
  it('thinks while reasoning or calling tools and types once answer text streams', () => {
    expect(pupoMoodForMessage(null)).toBe('idle')
    expect(pupoMoodForMessage({ content: '' })).toBe('thinking')
    expect(pupoMoodForMessage({ content: 'Hi' })).toBe('typing')
    expect(pupoMoodForMessage({ content: '', outputItems: [{ type: 'reasoning' }] })).toBe('thinking')
    expect(pupoMoodForMessage({ content: 'Let me check.', outputItems: [{ type: 'message' }, { type: 'function_call' }] })).toBe('thinking')
    expect(pupoMoodForMessage({ content: 'Done', outputItems: [{ type: 'reasoning' }, { type: 'message' }] })).toBe('typing')
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
