/**
 * LLM 錯誤型別
 * 用途：統一定義 LLM 模組的錯誤結構與代碼分類。
 */

/**
 * LLM 錯誤代碼
 * 用途：提供錯誤分類（timeout、rate limit 等），便於 fallback 與統計。
 */
export type LlmErrorCode =
  | 'TIMEOUT'
  | 'RATE_LIMIT'
  | 'SERVER_ERROR'
  | 'NETWORK_ERROR'
  | 'AUTH_ERROR'
  | 'INVALID_RESPONSE'
  | 'JSON_REPAIR_FAILED'
  | 'SCHEMA_VALIDATION_FAILED'
  | 'CONTEXT_COMPRESSION_FAILED'
  | 'PROVIDER_UNAVAILABLE'
  | 'EXPORT_FAILED'
  | 'RECORDING_FAILED'

/**
 * LLM 錯誤結構
 * 用途：提供標準化錯誤訊息與可觀察性資料。
 */
export type LlmError = {
  code: LlmErrorCode
  message: string
  meta?: Record<string, unknown>
}

/**
 * 建立 LLM 錯誤
 * 用途：快速建立符合規範的錯誤物件
 *
 * @param code 錯誤代碼
 * @param message 錯誤訊息
 * @param meta 其他錯誤上下文（可選）
 * @returns LlmError
 */
export const createLlmError = (
  code: LlmErrorCode,
  message: string,
  meta?: Record<string, unknown>
): LlmError => ({
  code,
  message,
  meta
})
