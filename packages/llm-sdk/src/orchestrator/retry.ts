/**
 * 重試策略
 * 用途：封裝重試配置與等待。
 */
import type { RetryConfig } from './types'

/**
 * 類：RetryStrategy
 * 用途：提供重試次數與延遲控制。
 */
export class RetryStrategy {
  private config: RetryConfig

  constructor(config: RetryConfig) {
    this.config = config
  }

  /**
   * 是否允許重試
   * 用途：判斷是否還有剩餘重試次數
   *
   * @param attempt 當前嘗試次數（從 1 開始）
   * @returns 是否允許重試
   */
  canRetry(attempt: number): boolean {
    return attempt < this.config.maxRetries
  }

  /**
   * 等待重試（指數退避 + 抖動）
   * 用途：按嘗試次數遞增等待時間，避免同時重試造成雪崩
   *
   * @param attempt 當前嘗試次數（從 1 開始）
   * @returns Promise<void>
   */
  async wait(attempt: number = 0): Promise<void> {
    const delay = Math.min(
      this.config.retryDelayMs * Math.pow(2, attempt),
      30000
    )
    const jitter = delay * 0.1 * Math.random()
    await new Promise((resolve) => setTimeout(resolve, delay + jitter))
  }
}
