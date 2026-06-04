import { describe, it, expect } from 'vitest'
import { Delta } from '../delta'

describe('Delta', () => {
  describe('constructor', () => {
    it('should create empty Delta with default ops', () => {
      const delta = new Delta()
      expect(delta.ops).toEqual([])
    })

    it('should create Delta with provided ops', () => {
      const ops = [{ insert: 'hello' }]
      const delta = new Delta(ops)
      expect(delta.ops).toEqual(ops)
    })
  })

  describe('insert', () => {
    it('should insert text without attributes', () => {
      const delta = new Delta()
      delta.insert('hello')
      expect(delta.ops).toEqual([{ insert: 'hello' }])
    })

    it('should insert text with attributes', () => {
      const delta = new Delta()
      delta.insert('hello', { bold: true })
      expect(delta.ops).toEqual([{ insert: 'hello', attributes: { bold: true } }])
    })

    it('should ignore empty attributes', () => {
      const delta = new Delta()
      delta.insert('hello', {})
      expect(delta.ops).toEqual([{ insert: 'hello' }])
    })

    it('should return this for chaining', () => {
      const delta = new Delta()
      const result = delta.insert('a')
      expect(result).toBe(delta)
    })
  })

  describe('delete', () => {
    it('should add delete op', () => {
      const delta = new Delta()
      delta.delete(5)
      expect(delta.ops).toEqual([{ delete: 5 }])
    })

    it('should ignore zero or negative length', () => {
      const delta = new Delta()
      delta.delete(0)
      delta.delete(-1)
      expect(delta.ops).toEqual([])
    })

    it('should return this for chaining', () => {
      const delta = new Delta()
      const result = delta.delete(1)
      expect(result).toBe(delta)
    })
  })

  describe('retain', () => {
    it('should add retain op', () => {
      const delta = new Delta()
      delta.retain(5)
      expect(delta.ops).toEqual([{ retain: 5 }])
    })

    it('should add retain op with attributes', () => {
      const delta = new Delta()
      delta.retain(5, { bold: true })
      expect(delta.ops).toEqual([{ retain: 5, attributes: { bold: true } }])
    })

    it('should ignore zero or negative length', () => {
      const delta = new Delta()
      delta.retain(0)
      delta.retain(-1)
      expect(delta.ops).toEqual([])
    })

    it('should return this for chaining', () => {
      const delta = new Delta()
      const result = delta.retain(1)
      expect(result).toBe(delta)
    })
  })

  describe('chaining', () => {
    it('should support fluent API', () => {
      const delta = new Delta()
        .insert('Hello')
        .retain(5, { bold: true })
        .delete(3)

      expect(delta.ops).toEqual([
        { insert: 'Hello' },
        { retain: 5, attributes: { bold: true } },
        { delete: 3 },
      ])
    })
  })

  describe('compress', () => {
    it('should merge adjacent string inserts with same attributes', () => {
      const delta = new Delta([
        { insert: 'Hel' },
        { insert: 'lo' },
      ])
      delta.compress()
      expect(delta.ops).toEqual([{ insert: 'Hello' }])
    })

    it('should not merge inserts with different attributes', () => {
      const delta = new Delta([
        { insert: 'Hel', attributes: { bold: true } },
        { insert: 'lo' },
      ])
      delta.compress()
      expect(delta.ops).toEqual([
        { insert: 'Hel', attributes: { bold: true } },
        { insert: 'lo' },
      ])
    })

    it('should merge inserts with same attributes object', () => {
      const delta = new Delta([
        { insert: 'Hel', attributes: { bold: true } },
        { insert: 'lo', attributes: { bold: true } },
      ])
      delta.compress()
      expect(delta.ops).toEqual([{ insert: 'Hello', attributes: { bold: true } }])
    })

    it('should not merge non-string inserts', () => {
      const delta = new Delta([
        { insert: 'hello' },
        { insert: { image: 'url' } },
      ])
      delta.compress()
      expect(delta.ops).toEqual([
        { insert: 'hello' },
        { insert: { image: 'url' } },
      ])
    })

    it('should return this for chaining', () => {
      const delta = new Delta()
      const result = delta.compress()
      expect(result).toBe(delta)
    })
  })

  describe('toJSON / fromJSON', () => {
    it('should serialize to JSON', () => {
      const delta = new Delta([{ insert: 'hello' }])
      expect(delta.toJSON()).toEqual({ ops: [{ insert: 'hello' }] })
    })

    it('should deserialize from JSON', () => {
      const delta = Delta.fromJSON({ ops: [{ insert: 'hello' }] })
      expect(delta.ops).toEqual([{ insert: 'hello' }])
    })

    it('should handle missing ops in fromJSON', () => {
      const delta = Delta.fromJSON({})
      expect(delta.ops).toEqual([])
    })
  })
})
