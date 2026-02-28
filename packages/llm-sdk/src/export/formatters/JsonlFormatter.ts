/**
 * JSONL 格式輸出
 * 用途：輸出微調用 JSONL 資料。
 */
import type { LLMRecord } from '../../recording/types'
import type { ExportOptions } from '../types'

/**
 * 轉換為 JSONL
 * 用途：每筆記錄輸出一行 JSON
 *
 * @param records LLM 記錄列表
 * @param options 導出選項
 * @returns JSONL 字串
 */
export const formatJsonl = (
  records: LLMRecord[],
  options: ExportOptions
): string => {
  return records
    .map((record) => {
      const assistantContent =
        record.response.repairedContent || record.response.raw
      const messages = [
        { role: 'system', content: record.request.systemPrompt },
        { role: 'user', content: record.request.userPrompt },
        { role: 'assistant', content: assistantContent }
      ]

      const meta: Record<string, unknown> = {
        session: record.sessionId || null,
        turn: record.turnIndex ?? null,
        quality: record.quality?.autoScore ?? null,
        status: record.status
      }

      if (options.includeContext) {
        meta.contextSummary = record.request.contextSummary || null
      }

      return JSON.stringify({ messages, meta })
    })
    .join('\n')
}
