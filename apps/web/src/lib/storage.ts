/**
 * Read a boolean from localStorage with a fallback default.
 */
export function getStoredBool(key: string, defaultVal: boolean): boolean {
  const val = localStorage.getItem(key)
  if (val === null) return defaultVal
  return val === 'true'
}

/**
 * Read a number from localStorage with a fallback default.
 */
export function getStoredNumber(key: string, defaultVal: number): number {
  const val = localStorage.getItem(key)
  if (val === null) return defaultVal
  const parsed = Number(val)
  return Number.isNaN(parsed) ? defaultVal : parsed
}

/**
 * Read a string from localStorage with a fallback default.
 */
export function getStoredString(key: string, defaultVal: string): string {
  return localStorage.getItem(key) ?? defaultVal
}

/**
 * Read a JSON-serialized object from localStorage with a fallback default.
 */
export function getStoredObject<T>(key: string, defaultVal: T): T {
  const val = localStorage.getItem(key)
  if (val === null) return defaultVal
  try {
    return JSON.parse(val) as T
  } catch {
    return defaultVal
  }
}
