import {
  BaseLLMAdapter,
  type LLMRequestOptions,
  type LLMResponse,
  type LLMStreamCallback
} from './types'
import { createAbortSignal } from '../shared/abort'

/**
 * 類：Ollama 適配器
 * 用途：對接本地 Ollama 模型
 *
 * 功能說明：
 * - 支持本地部署（無需 API Key）
 * - 降低 Token 成本
 * - 適合離線環境
 *
 * 注意：
 * - 需本地運行 Ollama 服務
 * - 默認端口 11434
 * - Prompt 需更簡潔（上下文限制）
 */
export class OllamaAdapter extends BaseLLMAdapter {
  private baseUrl: string

  /**
   * 建構函數：初始化 Ollama 適配器
   * 參數說明：
   * - modelId: 模型 ID（如 llama3, qwen2.5）
   * - baseUrl: Ollama 服務地址（默認 http://localhost:11434）
   * 副作用：保存模型 ID 和 baseUrl
   */
  constructor(modelId: string, baseUrl = 'http://localhost:11434') {
    super(modelId, '') // Ollama 不需要 API Key
    this.baseUrl = baseUrl
  }

  /**
   * 函數用途：發送 Ollama 聊天請求
   * 參數說明：options - 請求選項
   * 返回值：Promise<LLMResponse>
   * 副作用：調用本地 Ollama API
   */
  async chat(options: LLMRequestOptions): Promise<LLMResponse> {
    const { messages, temperature = 0.7, signal, timeoutMs } = options

    // Ollama 格式轉換
    const systemMsg = messages.find((m) => m.role === 'system')
    const prompt = messages
      .filter((m) => m.role !== 'system')
      .map((m) => m.content)
      .join('\n\n')

    const url = `${this.baseUrl}/api/generate`

    const { signal: abortSignal, cleanup } = createAbortSignal(signal, timeoutMs)
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortSignal,
        body: JSON.stringify({
          model: this.modelId,
          prompt,
          system: systemMsg?.content,
          temperature,
          stream: false
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Ollama API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()

      return {
        content: data.response,
        finishReason: 'stop'
      }
    } catch (error) {
      console.error('Ollama chat error:', error)
      throw error
    } finally {
      cleanup()
    }
  }

  /**
   * 函數用途：Ollama 流式請求
   * 參數說明：
   * - options: 請求選項
   * - callback: 流式回調
   * 返回值：Promise<void>
   * 副作用：SSE 連接、持續調用 callback
   */
  async stream(
    options: LLMRequestOptions,
    callback: LLMStreamCallback
  ): Promise<void> {
    const { messages, temperature = 0.7, signal, timeoutMs } = options

    const systemMsg = messages.find((m) => m.role === 'system')
    const prompt = messages
      .filter((m) => m.role !== 'system')
      .map((m) => m.content)
      .join('\n\n')

    const url = `${this.baseUrl}/api/generate`

    const { signal: abortSignal, cleanup } = createAbortSignal(signal, timeoutMs)
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortSignal,
        body: JSON.stringify({
          model: this.modelId,
          prompt,
          system: systemMsg?.content,
          temperature,
          stream: true
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Ollama stream error: ${response.status} - ${errorText}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body')
      }

      let lineBuffer = ''
      let doneSignaled = false

      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          break
        }

        const chunk = decoder.decode(value, { stream: true })
        lineBuffer += chunk
        const lines = lineBuffer.split('\n')
        lineBuffer = lines.pop() ?? ''

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line)

              if (data.response) {
                callback(data.response, data.done || false)
                if (data.done) doneSignaled = true
              }
            } catch {
              // 忽略解析錯誤
            }
          }
        }
      }

      // Process any remaining content in the buffer
      if (lineBuffer.trim()) {
        try {
          const data = JSON.parse(lineBuffer)
          if (data.response) {
            callback(data.response, data.done || false)
            if (data.done) doneSignaled = true
          }
        } catch {
          // 忽略解析錯誤
        }
      }

      if (!doneSignaled) {
        callback('', true)
      }
    } catch (error) {
      console.error('Ollama stream error:', error)
      throw error
    } finally {
      cleanup()
    }
  }

  /**
   * 函數用途：檢查 Ollama 服務是否可用
   * 參數說明：無
   * 返回值：Promise<boolean>
   * 副作用：發送健康檢查請求
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`)
      return response.ok
    } catch {
      return false
    }
  }
}
