import {
  getStoredBool,
  getStoredNumber,
  getStoredString,
  getStoredObject,
} from '@/lib/storage'

describe('getStoredBool', () => {
  it('returns default when key does not exist', () => {
    expect(getStoredBool('missing', true)).toBe(true)
    expect(getStoredBool('missing', false)).toBe(false)
  })

  it('returns true when value is "true"', () => {
    localStorage.setItem('b', 'true')
    expect(getStoredBool('b', false)).toBe(true)
  })

  it('returns false when value is "false"', () => {
    localStorage.setItem('b', 'false')
    expect(getStoredBool('b', true)).toBe(false)
  })

  it('returns false for non-"true" string', () => {
    localStorage.setItem('b', 'yes')
    expect(getStoredBool('b', true)).toBe(false)
  })
})

describe('getStoredNumber', () => {
  it('returns default when key does not exist', () => {
    expect(getStoredNumber('missing', 99)).toBe(99)
  })

  it('parses integer string', () => {
    localStorage.setItem('n', '42')
    expect(getStoredNumber('n', 0)).toBe(42)
  })

  it('returns default for non-numeric string', () => {
    localStorage.setItem('n', 'abc')
    expect(getStoredNumber('n', 7)).toBe(7)
  })

  it('parses float string', () => {
    localStorage.setItem('n', '3.14')
    expect(getStoredNumber('n', 0)).toBeCloseTo(3.14)
  })
})

describe('getStoredString', () => {
  it('returns default when key does not exist', () => {
    expect(getStoredString('missing', 'fallback')).toBe('fallback')
  })

  it('returns stored value when key exists', () => {
    localStorage.setItem('s', 'hello')
    expect(getStoredString('s', 'fallback')).toBe('hello')
  })
})

describe('getStoredObject', () => {
  it('returns default when key does not exist', () => {
    const def = { a: 1 }
    expect(getStoredObject('missing', def)).toBe(def)
  })

  it('parses valid JSON', () => {
    localStorage.setItem('o', JSON.stringify({ x: 10, y: [1, 2] }))
    expect(getStoredObject('o', {})).toEqual({ x: 10, y: [1, 2] })
  })

  it('returns default for invalid JSON', () => {
    localStorage.setItem('o', '{broken')
    const def = { fallback: true }
    expect(getStoredObject('o', def)).toBe(def)
  })
})
