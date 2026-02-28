/**
 * LLM 適配器基礎類型定義與抽象類
 * 用途：定義所有 LLM 適配器的統一接口
 */

/**
 * 類型定義：LLM 提供商
 * 用途：支持的 LLM 服務商
 */
export type LLMProvider = 'google' | 'xai' | 'chatgpt' | 'ollama'

/**
 * 類型定義：LLM 消息角色
 * 用途：區分對話中的發送者
 */
export type MessageRole = 'system' | 'user' | 'assistant'

/**
 * 接口定義：LLM 消息結構
 * 用途：統一不同 LLM 提供商的消息格式
 *
 * 字段說明：
 * - role: 消息角色（system/user/assistant）
 * - content: 消息內容
 */
export interface LLMMessage {
  role: MessageRole
  content: string
}

/**
 * 接口定義：LLM 請求選項
 * 用途：統一 LLM 請求參數
 *
 * 字段說明：
 * - messages: 對話消息列表
 * - temperature: 溫度參數（0-1，控制隨機性）
 * - maxTokens: 最大生成 token 數
 * - stream: 是否啟用流式輸出
 * - locale: 語言代碼（用於多語言提示）
 * - signal: 中止訊號（取消/超時）
 * - timeoutMs: 超時毫秒（可選）
 */
export interface LLMRequestOptions {
  messages: LLMMessage[]
  temperature?: number
  maxTokens?: number
  stream?: boolean
  locale?: string
  signal?: AbortSignal
  timeoutMs?: number
}

/**
 * 接口定義：LLM 響應結構
 * 用途：統一不同 LLM 提供商的響應格式
 *
 * 字段說明：
 * - content: 生成的文本內容
 * - usage: Token 使用統計
 * - finishReason: 結束原因（stop/length/error）
 */
export interface LLMResponse {
  content: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  finishReason?: 'stop' | 'length' | 'error'
}

/**
 * 類型定義：LLM 流式響應回調
 * 用途：處理流式輸出的增量內容
 *
 * 參數說明：
 * - chunk: 當前接收到的內容片段
 * - done: 是否完成（true 表示流式輸出結束）
 */
export type LLMStreamCallback = (chunk: string, done: boolean) => void

/**
 * 抽象類：LLM 適配器基類
 * 用途：定義所有 LLM 適配器的統一接口
 *
 * 功能說明：
 * - 統一 chat() 方法（非流式請求）
 * - 統一 stream() 方法（流式請求）
 * - 統一錯誤處理
 * - 提供商特定實現由子類完成
 */
export abstract class BaseLLMAdapter {
  protected modelId: string
  protected apiKey: string

  /**
   * 建構函數：初始化適配器
   * 參數說明：
   * - modelId: 模型 ID（如 gemini-2.0-flash、grok-4.1）
   * - apiKey: API 金鑰（Ollama 可選）
   * 副作用：保存模型 ID 和 API Key
   */
  constructor(modelId: string, apiKey: string) {
    this.modelId = modelId
    this.apiKey = apiKey
  }

  /**
   * 函數用途：發送聊天請求（非流式）
   * 參數說明：options - 請求選項
   * 返回值：Promise<LLMResponse>
   * 副作用：發送 HTTP 請求到 LLM 提供商
   *
   * 注意：子類必須實現此方法
   */
  abstract chat(options: LLMRequestOptions): Promise<LLMResponse>

  /**
   * 函數用途：發送流式聊天請求
   * 參數說明：
   * - options: 請求選項
   * - callback: 流式回調函數
   * 返回值：Promise<void>
   * 副作用：發送 SSE 請求、持續調用 callback
   *
   * 注意：子類必須實現此方法
   */
  abstract stream(
    options: LLMRequestOptions,
    callback: LLMStreamCallback
  ): Promise<void>

  /**
   * 函數用途：驗證 API Key 是否有效
   * 參數說明：無
   * 返回值：Promise<boolean>
   * 副作用：發送測試請求
   *
   * 注意：子類可選實現
   */
  async validateApiKey(): Promise<boolean> {
    try {
      await this.chat({
        messages: [{ role: 'user', content: 'test' }],
        maxTokens: 1
      })
      return true
    } catch {
      return false
    }
  }
}
