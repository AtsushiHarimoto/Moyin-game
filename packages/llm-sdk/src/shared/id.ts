/**
 * ID 生成器
 * 用途：提供非時間戳的唯一識別碼，避免關鍵流程依賴時間戳。
 */

let fallbackCounter = 0

/**
 * 產生唯一 ID
 * 用途：優先使用 crypto.randomUUID，避免時間戳作為唯一性來源
 *
 * @param prefix ID 前綴
 * @returns 唯一 ID 字串
 */
export const createId = (prefix: string): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`
  }
  fallbackCounter += 1
  const random = Math.random().toString(16).slice(2)
  return `${prefix}_${fallbackCounter}_${random}`
}
