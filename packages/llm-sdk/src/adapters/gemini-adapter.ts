import {
  BaseLLMAdapter,
  type LLMRequestOptions,
  type LLMResponse,
  type LLMStreamCallback
} from './types'
import { createAbortSignal } from '../shared/abort'

/**
 * 類：Gemini 適配器
 * 用途：對接 Google Gemini API
 *
 * 功能說明：
 * - 轉換消息格式為 Gemini 格式
 * - 處理流式響應（SSE）
 * - 錯誤處理與重試
 */
export class GeminiAdapter extends BaseLLMAdapter {
  private baseUrl: string

  /**
   * 函數用途：發送 Gemini 聊天請求 (Via Web2API)
   */
  constructor(modelId: string, apiKey: string, baseUrl?: string) {
    super(modelId, apiKey)
    this.baseUrl = baseUrl || 'http://localhost:8000/api/v1/gemini'
  }

  async chat(options: LLMRequestOptions): Promise<LLMResponse> {
    const {
      messages,
      temperature: _temperature = 0.7,
      maxTokens: _maxTokens = 2000,
      signal,
      timeoutMs
    } = options

    const systemMsg = messages.find(m => m.role === 'system')
    const contents = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }))

    const url = `${this.baseUrl}/chat`
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
          contents,
          ...(systemMsg ? { systemInstruction: { parts: [{ text: systemMsg.content }] } } : {}),
          stream: false
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Gemini Proxy error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()

      return {
        content: data.text || '',
        usage: data.usageMetadata ? {
          promptTokens: data.usageMetadata.promptTokenCount ?? 0,
          completionTokens: data.usageMetadata.candidatesTokenCount ?? 0,
          totalTokens: data.usageMetadata.totalTokenCount ?? 0,
        } : undefined,
        finishReason: 'stop'
      }
    } catch (error) {
      console.error('Gemini chat error:', error)
      throw error
    } finally {
      cleanup()
    }
  }

  /**
   * 函數用途：Gemini 流式請求 (Via Web2API)
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

    const systemMsg = messages.find(m => m.role === 'system')
    const contents = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }))

    const url = `${this.baseUrl}/chat`
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
          contents,
          ...(systemMsg ? { systemInstruction: { parts: [{ text: systemMsg.content }] } } : {}),
          stream: true
        })
      })

      if (!response.ok) {
        throw new Error(`Gemini Stream error: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) throw new Error('No response body')

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
                try {
                    const data = JSON.parse(line.slice(6))
                    if (data.content) {
                        callback(data.content, false)
                    }
                } catch {
                    continue
                }
            }
        }
      }

      // Process any remaining content in the buffer
      if (lineBuffer.startsWith('data: ')) {
        try {
          const data = JSON.parse(lineBuffer.slice(6))
          if (data.content) {
            callback(data.content, false)
          }
        } catch {
          // ignore parse errors
        }
      }

      callback('', true)
    } catch (error) {
      console.error('Gemini stream error:', error)
      throw error
    } finally {
      cleanup()
    }
  }
}
