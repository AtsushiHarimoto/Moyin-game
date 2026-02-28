/**
 * 品質評分型別
 * 用途：定義自動評分與標記結構。
 */
import type { LlmResponse } from '../shared/llm-types'

export type QualityFlag =
  | 'too_short'
  | 'too_long'
  | 'out_of_character'
  | 'context_ignored'
  | 'repetitive'
  | 'hallucination'
  | 'format_error'

export type AutoScoreResult = {
  overall: number
  dimensions: {
    formatCompliance: number
    characterConsistency: number
    contextRelevance: number
    narrativeQuality: number
    responseLength: number
  }
  flags: QualityFlag[]
  raw?: LlmResponse
}

export type QualityFilter = {
  minAutoScore?: number
  minManualScore?: number
  excludeTags?: string[]
  includeTags?: string[]
  statusFilter?: Array<'success' | 'repaired' | 'failed' | 'fallback'>
}
