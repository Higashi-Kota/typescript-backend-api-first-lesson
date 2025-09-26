import { describe, expect, it } from 'vitest'
import { createId } from '../id/createId'

describe('createId', () => {
  it('should generate a valid UUID v7', () => {
    const id = createId()

    // UUID v7 format: xxxxxxxx-xxxx-7xxx-xxxx-xxxxxxxxxxxx
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    expect(id).toMatch(uuidRegex)
  })

  it('should generate unique IDs', () => {
    const ids = new Set()
    const count = 1000

    for (let i = 0; i < count; i++) {
      ids.add(createId())
    }

    // All IDs should be unique
    expect(ids.size).toBe(count)
  })

  it('should generate IDs in chronological order', () => {
    const id1 = createId()
    // Small delay to ensure different timestamp
    const id2 = createId()
    const id3 = createId()

    // UUID v7 is time-ordered, so later IDs should be "greater"
    expect(id1 < id2).toBe(true)
    expect(id2 < id3).toBe(true)
  })

  it('should have correct version bits', () => {
    const id = createId()
    const parts = id.split('-')

    // The third part should start with '7' for UUID v7
    expect(parts[2]?.[0]).toBe('7')
  })

  it('should have correct variant bits', () => {
    const id = createId()
    const parts = id.split('-')

    // The fourth part should start with 8, 9, a, or b for UUID variant 10
    expect(['8', '9', 'a', 'b']).toContain(parts[3]?.[0]?.toLowerCase())
  })
})
