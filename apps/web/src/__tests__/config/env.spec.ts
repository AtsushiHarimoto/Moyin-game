import { vi } from 'vitest'
import { parseBoolean, parseNumber, parseNetMode, parseGemList } from '@/config/env'

describe('parseBoolean', () => {
  it('returns boolean input as-is', () => {
    expect(parseBoolean(true)).toBe(true)
    expect(parseBoolean(false)).toBe(false)
  })

  it('recognises truthy strings', () => {
    for (const v of ['true', '1', 'yes', 'on', ' TRUE ', 'Y']) {
      expect(parseBoolean(v)).toBe(true)
    }
  })

  it('recognises falsy strings', () => {
    for (const v of ['false', '0', 'no', 'off', ' FALSE ', 'N']) {
      expect(parseBoolean(v)).toBe(false)
    }
  })

  it('returns fallback for empty string', () => {
    expect(parseBoolean('')).toBe(false)
    expect(parseBoolean('', true)).toBe(true)
  })

  it('returns fallback for undefined', () => {
    expect(parseBoolean(undefined)).toBe(false)
    expect(parseBoolean(undefined, true)).toBe(true)
  })
})

describe('parseNumber', () => {
  it('parses integer string', () => {
    expect(parseNumber('42', 0)).toBe(42)
  })

  it('parses float string', () => {
    expect(parseNumber('3.14', 0)).toBe(3.14)
  })

  it('returns fallback for NaN string', () => {
    expect(parseNumber('abc', 99)).toBe(99)
  })

  it('returns fallback for Infinity string', () => {
    expect(parseNumber('Infinity', 10)).toBe(10)
  })

  it('returns fallback for boolean input', () => {
    expect(parseNumber(true, 7)).toBe(7)
    expect(parseNumber(false, 7)).toBe(7)
  })
})

describe('parseNetMode', () => {
  it('returns mock when value is "mock"', () => {
    expect(parseNetMode('mock')).toBe('mock')
  })

  it('returns real for any other value', () => {
    expect(parseNetMode('real')).toBe('real')
    expect(parseNetMode('whatever')).toBe('real')
    expect(parseNetMode('')).toBe('real')
  })
})

describe('parseGemList', () => {
  it('returns empty array for empty string', () => {
    expect(parseGemList('')).toEqual([])
  })

  it('returns empty array for non-array JSON', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(parseGemList('{}')).toEqual([])
    expect(spy).toHaveBeenCalledOnce()
    spy.mockRestore()
  })

  it('maps string array to GemOption[]', () => {
    expect(parseGemList('["a","b"]')).toEqual([
      { id: 'a', label: 'a' },
      { id: 'b', label: 'b' },
    ])
  })

  it('maps object array with id and label', () => {
    const input = JSON.stringify([
      { id: 'gpt-4', label: 'GPT-4' },
      { id: 'claude', label: 'Claude' },
    ])
    expect(parseGemList(input)).toEqual([
      { id: 'gpt-4', label: 'GPT-4' },
      { id: 'claude', label: 'Claude' },
    ])
  })

  it('returns empty array for invalid JSON', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(parseGemList('not json')).toEqual([])
    expect(spy).toHaveBeenCalledOnce()
    spy.mockRestore()
  })
})
