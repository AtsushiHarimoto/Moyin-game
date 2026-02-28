import {
  BaseLLMAdapter,
  type LLMRequestOptions,
  type LLMResponse,
  type LLMStreamCallback
} from './types'
import { createAbortSignal } from '../shared/abort'

/**
 * 類：ChatGPT 適配器
 * 用途：對接 Web2API 的 ChatGPT 代理接口
 *
 * 功能說明：
 * - 調用 Web2API 的 /v1/official/chatgpt/chat 接口
 * - 支持流式與非流式輸出的標準化
 * - 處理 OpenAI 格式的響應
 *
 * 遷移說明：原始版本使用 @microsoft/fetch-event-source，
 * 已改為原生 fetch + ReadableStream 實現 SSE。
 */
export class ChatGPTAdapter extends BaseLLMAdapter {
  private baseUrl: string

  constructor(modelId: string, apiKey: string, baseUrl: string) {
    super(modelId, apiKey)
    this.baseUrl = baseUrl.replace(/\/$/, '') // 移除尾部斜線
  }

  /**
   * 函數用途：發送 ChatGPT 聊天請求
   * 參數說明：options - 請求選項
   * 返回值：Promise<LLMResponse>
   */
  async chat(options: LLMRequestOptions): Promise<LLMResponse> {
    const {
      messages,
      signal,
      timeoutMs
    } = options

    const url = `${this.baseUrl}/api/v1/official/chatgpt/chat`
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
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          stream: false
        })
      })

      if (!response.ok) {
        throw new Error(`ChatGPT API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      return {
        content: data.text || '',
        finishReason: 'stop'
      }
    } catch (error) {
      console.error('ChatGPT chat error:', error)
      throw error
    } finally {
      cleanup()
    }
  }

  /**
   * 函數用途：ChatGPT 流式請求
   * 遷移說明：使用原生 fetch + ReadableStream 取代 @microsoft/fetch-event-source
   */
  async stream(
    options: LLMRequestOptions,
    callback: LLMStreamCallback
  ): Promise<void> {
    const {
      messages,
      signal,
      timeoutMs
    } = options

    const url = `${this.baseUrl}/api/v1/official/chatgpt/chat`
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
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          stream: true
        })
      })

      if (!response.ok) {
        throw new Error(`ChatGPT stream error: ${response.status}`)
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
              if (parsed.content) {
                callback(parsed.content, false)
              }
            } catch {
              // ignore parse errors
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
            if (parsed.content) {
              callback(parsed.content, false)
            }
          } catch {
            // ignore parse errors
          }
        }
      }

      callback('', true)
    } catch (error) {
      console.error('ChatGPT stream error:', error)
      throw error
    } finally {
      cleanup()
    }
  }
}
