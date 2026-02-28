/**
 * AbortSignal 工具
 * 用途：合併外部 signal 與 timeout 生成可取消的 signal。
 */

/**
 * 建立可取消的 AbortSignal
 * 用途：合併外部 signal 與 timeout
 *
 * @param signal 外部 signal（可選）
 * @param timeoutMs 超時毫秒（可選）
 * @returns AbortSignal 或 undefined
 */
export const createAbortSignal = (
  signal?: AbortSignal,
  timeoutMs?: number
): { signal?: AbortSignal; cleanup: () => void } => {
  const controller = new AbortController()
  const cleanups: Array<() => void> = []

  if (signal) {
    if (signal.aborted) {
      controller.abort()
    } else {
      const handler = () => controller.abort()
      signal.addEventListener('abort', handler)
      cleanups.push(() => signal.removeEventListener('abort', handler))
    }
  }

  let timeoutId: ReturnType<typeof setTimeout> | null = null
  if (typeof timeoutMs === 'number' && timeoutMs > 0) {
    timeoutId = setTimeout(() => controller.abort(), timeoutMs)
    cleanups.push(() => {
      if (timeoutId) clearTimeout(timeoutId)
    })
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      cleanups.forEach((fn) => fn())
    }
  }
}
