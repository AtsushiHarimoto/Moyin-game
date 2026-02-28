/**
 * 上下文摘要生成器
 * 用途：使用 LLM 生成歷史摘要。
 */
import { LLMAdapterFactory } from '../adapters/index'
import type { LLMMessage, LLMProvider } from '../adapters/types'

export type SummaryProviderConfig = {
  provider: LLMProvider
  modelId: string
  apiKey: string
  baseUrl?: string
}

/**
 * 類：SummaryGenerator
 * 用途：根據歷史對話生成摘要，降低上下文長度。
 */
export class SummaryGenerator {
  private provider: SummaryProviderConfig

  constructor(provider: SummaryProviderConfig) {
    this.provider = provider
  }

  /**
   * 生成摘要
   * 用途：將歷史對話壓縮為簡潔摘要
   *
   * @param messages 對話訊息陣列
   * @param locale 語言代碼
   * @param signal 中止訊號（可選）
   * @returns 摘要文字
   */
  async generate(
    messages: LLMMessage[],
    locale: string,
    signal?: AbortSignal
  ): Promise<string> {
    const adapter = LLMAdapterFactory.create(
      this.provider.provider,
      this.provider.modelId,
      this.provider.apiKey,
      this.provider.baseUrl
    )

    const prompt = this.buildSummaryPrompt(messages, locale)
    const response = await adapter.chat({
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user }
      ],
      temperature: 0.2,
      maxTokens: 800,
      locale,
      signal
    })
    return response.content
  }

  private buildSummaryPrompt(messages: LLMMessage[], locale: string): {
    system: string
    user: string
  } {
    const system =
      locale === 'ja-JP'
        ? '対話の要約者です。ストーリーの重要な転換点とキャラクターの関係の変化を保持してください。'
        : locale === 'en-US'
          ? 'You are a dialogue summarizer. Keep plot turns and relationship changes.'
          : '你是對話摘要器，請保留劇情關鍵轉折與角色關係變化。'

    const user = messages
      .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n')

    return { system, user }
  }
}
