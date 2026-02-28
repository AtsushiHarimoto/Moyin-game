/**
 * 上下文壓縮器
 * 用途：將長對話摘要化，保留最近回合內容。
 */
import type { LLMMessage } from '../adapters/types'
import { TokenCounter } from './TokenCounter'
import { SummaryGenerator } from './SummaryGenerator'
import type { CompressedContext, CompressionConfig } from './types'

/**
 * 類：ContextCompressor
 * 用途：提供上下文壓縮策略。
 */
export class ContextCompressor {
  private config: CompressionConfig
  private tokenCounter: TokenCounter
  private summaryGenerator: SummaryGenerator

  constructor(
    config: CompressionConfig,
    summaryGenerator: SummaryGenerator,
    tokenCounter?: TokenCounter
  ) {
    this.config = config
    this.summaryGenerator = summaryGenerator
    this.tokenCounter = tokenCounter || new TokenCounter()
  }

  /**
   * 壓縮上下文
   * 用途：若超過閾值，將較舊對話摘要化
   *
   * @param messages 完整對話訊息
   * @param locale 語言代碼
   * @param signal 中止訊號（可選）
   * @returns 壓縮後上下文
   */
  async compress(
    messages: LLMMessage[],
    locale: string,
    signal?: AbortSignal
  ): Promise<CompressedContext> {
    const joined = messages.map((msg) => msg.content).join('\n')
    const estimatedTokens = this.tokenCounter.estimate(joined)

    if (estimatedTokens <= this.config.summaryThreshold) {
      return {
        summary: '',
        keyEvents: [],
        recentTurns: messages,
        estimatedTokens
      }
    }

    const keepCount = Math.max(0, this.config.keepRecentTurns * 2)
    const recentTurns = keepCount
      ? messages.slice(-keepCount)
      : messages
    const olderTurns = keepCount ? messages.slice(0, -keepCount) : []

    const summary = olderTurns.length
      ? await this.summaryGenerator.generate(olderTurns, locale, signal)
      : ''

    return {
      summary,
      keyEvents: this.extractKeyEvents(summary),
      recentTurns,
      estimatedTokens
    }
  }

  private extractKeyEvents(summary: string): string[] {
    if (!summary) return []
    return summary
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .slice(0, 8)
  }
}
