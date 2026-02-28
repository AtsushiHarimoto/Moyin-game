import {
  BaseLLMAdapter,
  type LLMRequestOptions,
  type LLMResponse,
  type LLMStreamCallback
} from './types'
import { createAbortSignal } from '../shared/abort'

/**
 * 類：Grok 適配器
 * 用途：對接 xAI Grok API（OpenAI 兼容格式）
 *
 * 注意：Grok 使用 OpenAI 兼容的 API 格式
 */
export class GrokAdapter extends BaseLLMAdapter {
  private baseUrl: string

  /**
   * 建構函數：初始化 Grok 適配器
   * @param modelId 模型 ID
   * @param apiKey API Key（可為空）
   * @param baseUrl Web2API base URL
   */
  constructor(modelId: string, apiKey: string, baseUrl?: string) {
    super(modelId, apiKey)
    this.baseUrl = baseUrl || 'http://localhost:8000/v1'
  }

  /**
   * 函數用途：發送 Grok 聊天請求
   * 參數說明：options - 請求選項
   * 返回值：Promise<LLMResponse>
   * 副作用：調用 Grok API (Via Web2API Proxy)
   */
  async chat(options: LLMRequestOptions): Promise<LLMResponse> {
    const {
      messages,
      temperature = 0.7,
      maxTokens = 2000,
      signal,
      timeoutMs
    } = options

    const url = `${this.baseUrl}/chat/completions`
    const token = this.apiKey

    const { signal: abortSignal, cleanup } = createAbortSignal(signal, timeoutMs)
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        signal: abortSignal,
        body: JSON.stringify({
          model: this.modelId,
          messages,
          temperature,
          max_tokens: maxTokens,
          stream: false
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Grok API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      const choice = data.choices?.[0]

      if (!choice) {
        throw new Error('No choice in Grok response')
      }

      return {
        content: choice.message.content,
        usage: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens
            }
          : undefined,
        finishReason: choice.finish_reason === 'stop' ? 'stop' : 'length'
      }
    } catch (error) {
      console.error('Grok chat error:', error)
      throw error
    } finally {
      cleanup()
    }
  }

  /**
   * 函數用途：Grok 流式請求
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
    const {
      messages,
      temperature = 0.7,
      maxTokens = 2000,
      signal,
      timeoutMs
    } = options

    const url = `${this.baseUrl}/chat/completions`
    const token = this.apiKey

    const { signal: abortSignal, cleanup } = createAbortSignal(signal, timeoutMs)
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        signal: abortSignal,
        body: JSON.stringify({
          model: this.modelId,
          messages,
          temperature,
          max_tokens: maxTokens,
          stream: true
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Grok stream error: ${response.status} - ${errorText}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body')
      }

      let lineBuffer = ''

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
          if (line.startsWith('data: ')) {
            const data = line.slice(6)

            if (data === '[DONE]') {
              continue
            }

            try {
              const parsed = JSON.parse(data)
              const delta = parsed.choices?.[0]?.delta?.content

              if (delta) {
                callback(delta, false)
              }
            } catch {
              // 忽略解析錯誤
            }
          }
        }
      }

      // Process any remaining content in the buffer
      if (lineBuffer.startsWith('data: ')) {
        const data = lineBuffer.slice(6)
        if (data !== '[DONE]') {
          try {
            const parsed = JSON.parse(data)
            const delta = parsed.choices?.[0]?.delta?.content
            if (delta) {
              callback(delta, false)
            }
          } catch {
            // 忽略解析錯誤
          }
        }
      }

      callback('', true)
    } catch (error) {
      console.error('Grok stream error:', error)
      throw error
    } finally {
      cleanup()
    }
  }
}
