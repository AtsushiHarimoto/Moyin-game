/**
 * LLM 記錄型別定義
 * 用途：統一 LLM 調用記錄、錯誤、修復與品質資料結構。
 */
import type { LLMMessage } from '../adapters/types'
import type { LlmTurnRequest, LlmResponse } from '../shared/llm-types'
import type { RepairAction } from '../repair/types'

export type LlmRecordStatus = 'success' | 'repaired' | 'failed' | 'fallback'

/**
 * LLM 記錄
 * 用途：保存一次 LLM 調用的完整上下文與結果。
 */
export type LLMRecord = {
  id: string
  sessionId?: string | null
  turnIndex?: number | null
  timestamp: number
  provider: string
  model?: string | null
  status: LlmRecordStatus
  request: {
    systemPrompt: string
    userPrompt: string
    contextSummary?: string
    fullContext?: LLMMessage[]
    turnContext?: LlmTurnRequest
  }
  response: {
    raw: string
    parsed?: LlmResponse
    repairAttempts?: number
    repairedContent?: string
  }
  meta: {
    latencyMs: number
    promptTokens?: number
    completionTokens?: number
    status: LlmRecordStatus
    fallbackChain?: string[]
    errorMessage?: string
  }
  quality?: {
    autoScore?: number
    manualScore?: number
    tags?: string[]
    notes?: string
  }
}

/**
 * LLM 錯誤記錄
 * 用途：保存 LLM 調用失敗的錯誤資訊。
 */
export type LLMErrorRecord = {
  id: string
  recordId?: string | null
  sessionId?: string | null
  timestamp: number
  provider?: string | null
  model?: string | null
  errorCode: string
  errorMessage: string
  requestSnapshot?: LlmTurnRequest
  meta?: Record<string, unknown>
}

/**
 * JSON 修復記錄
 * 用途：保存修復過程與結果。
 */
export type LLMRepairRecord = {
  id: string
  recordId: string
  timestamp: number
  success: boolean
  actions: RepairAction[]
  validationErrors?: string[]
}

/**
 * 品質評分記錄
 * 用途：保存手動評分與標籤。
 */
export type QualityRating = {
  id: string
  recordId: string
  timestamp: number
  score: 1 | 2 | 3 | 4 | 5
  tags?: string[]
  notes?: string
}
