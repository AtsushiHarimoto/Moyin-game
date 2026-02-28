/**
 * 上下文壓縮型別
 * 用途：定義壓縮配置與輸出資料結構。
 */
import type { LLMMessage } from '../adapters/types'

export type CompressionConfig = {
  maxContextTokens: number
  summaryThreshold: number
  keepRecentTurns: number
  compressionRatio: number
}

export type CompressedContext = {
  summary: string
  keyEvents: string[]
  recentTurns: LLMMessage[]
  estimatedTokens: number
}
