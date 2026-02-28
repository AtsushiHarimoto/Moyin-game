/**
 * OpenAI 格式輸出
 * 用途：輸出通用微調格式（messages 陣列）。
 */
import type { LLMRecord } from '../../recording/types'
import type { ExportOptions } from '../types'

/**
 * 轉換為 OpenAI 格式
 * 用途：輸出 messages 陣列列表
 *
 * @param records LLM 記錄列表
 * @param options 導出選項
 * @returns JSON 字串
 */
export const formatOpenAI = (
  records: LLMRecord[],
  options: ExportOptions
): string => {
  const payload = records.map((record) => {
    const assistantContent =
      record.response.repairedContent || record.response.raw
    return {
      messages: [
        { role: 'system', content: record.request.systemPrompt },
        { role: 'user', content: record.request.userPrompt },
        { role: 'assistant', content: assistantContent }
      ],
      meta: options.includeContext
        ? { contextSummary: record.request.contextSummary || null }
        : undefined
    }
  })

  return options.prettyPrint
    ? JSON.stringify(payload, null, 2)
    : JSON.stringify(payload)
}
