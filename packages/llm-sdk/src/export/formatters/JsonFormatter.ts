/**
 * JSON 格式輸出
 * 用途：輸出完整對話樹 JSON。
 */
import type { LLMRecord } from '../../recording/types'
import type { ExportOptions } from '../types'

type JsonSession = {
  sessionId: string
  turns: Array<Record<string, unknown>>
}

/**
 * 轉換為 JSON
 * 用途：輸出包含 sessions 的完整 JSON 結構
 *
 * @param records LLM 記錄列表
 * @param options 導出選項
 * @returns JSON 字串
 */
export const formatJson = (
  records: LLMRecord[],
  options: ExportOptions
): string => {
  const bySession = new Map<string, JsonSession>()
  records.forEach((record) => {
    const sessionId = record.sessionId || 'unknown'
    if (!bySession.has(sessionId)) {
      bySession.set(sessionId, { sessionId, turns: [] })
    }
    const session = bySession.get(sessionId)!
    session.turns.push({
      turnIndex: record.turnIndex ?? null,
      provider: record.provider,
      model: record.model ?? null,
      request: {
        systemPrompt: record.request.systemPrompt,
        userPrompt: record.request.userPrompt,
        contextSummary: record.request.contextSummary || null
      },
      response: {
        raw: options.includeRaw ? record.response.raw : undefined,
        parsed: record.response.parsed || undefined,
        repairedContent: options.includeRepairs
          ? record.response.repairedContent
          : undefined
      },
      meta: record.meta,
      quality: record.quality || null
    })
  })

  const sessions = Array.from(bySession.values())
  const result = {
    exportVersion: '1.0',
    exportDate: new Date().toISOString(),
    sessions,
    statistics: {
      totalSessions: sessions.length,
      totalTurns: records.length
    }
  }

  return options.prettyPrint
    ? JSON.stringify(result, null, 2)
    : JSON.stringify(result)
}
