/**
 * 流式響應型別
 * 用途：描述流式處理配置與進度回調。
 */
import type { LlmRawFrame } from '../shared/llm-types'

export type StreamProgress = {
  phase: 'connecting' | 'receiving' | 'parsing' | 'done' | 'error'
  receivedChars: number
  estimatedTotal?: number
  partialFrames?: Partial<LlmRawFrame>[]
  elapsedMs: number
}

export type StreamConfig = {
  enabled: boolean
  chunkDelayMs: number
  showPartialJson: boolean
  progressCallback?: (progress: StreamProgress) => void
}
