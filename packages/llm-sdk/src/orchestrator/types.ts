/**
 * LLM 調度層型別
 * 用途：定義調度器配置與回傳結果。
 */
import type { LLMProvider } from '../adapters/types'
import type { LlmResponse } from '../shared/llm-types'
import type { RepairAction } from '../repair/types'

export type ProviderConfig = {
  provider: LLMProvider
  modelId: string
  apiKey: string
  baseUrl?: string
  priority: number
}

export type RetryConfig = {
  maxRetries: number
  retryDelayMs: number
}

export type TimeoutConfig = {
  requestTimeoutMs: number
}

export type OrchestratorConfig = {
  providers: ProviderConfig[]
  retry: RetryConfig
  timeout: TimeoutConfig
  contextEnabled: boolean
  streamEnabled: boolean
}

export type OrchestratorResult = {
  rawText: string
  parsed?: LlmResponse
  repaired: boolean
  repairActions: RepairAction[]
  provider: string
  model?: string | null
  usage?: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  }
  latencyMs: number
  status: 'success' | 'repaired' | 'failed' | 'fallback'
  fallbackChain: string[]
  validationErrors?: string[]
}
