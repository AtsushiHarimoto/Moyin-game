/**
 * 導出服務
 * 用途：提供 LLM 記錄導出能力。
 */
import { RecordStore } from '../recording/RecordStore'
import type { LLMRecord } from '../recording/types'
import { applyQualityFilter } from '../quality/QualityFilter'
import { createLlmError, type LlmError } from '../shared/errors'
import { err, ok, type Result } from '../shared/result'
import type { ExportOptions, ExportResult } from './types'
import { formatJsonl } from './formatters/JsonlFormatter'
import { formatJson } from './formatters/JsonFormatter'
import { formatOpenAI } from './formatters/OpenAIFormatter'

/**
 * 類：ExportService
 * 用途：查詢記錄並輸出指定格式。
 */
export class ExportService {
  private store: RecordStore

  constructor(store?: RecordStore) {
    this.store = store || new RecordStore()
  }

  /**
   * 導出記錄
   * 用途：依指定格式輸出記錄資料
   *
   * @param options 導出選項
   * @returns Result：成功為 ExportResult，失敗為 LlmError
   */
  async export(options: ExportOptions): Promise<Result<ExportResult, LlmError>> {
    try {
      const records = await this.store.queryRecords({
        dateRange: options.dateRange,
        sessionIds: options.sessionIds,
        statusFilter: options.filter?.statusFilter,
        minAutoScore: options.filter?.minAutoScore,
        minManualScore: options.filter?.minManualScore,
        includeTags: options.filter?.includeTags,
        excludeTags: options.filter?.excludeTags
      })
      const filtered = applyQualityFilter(records, options.filter)
      const formatted = this.formatRecords(filtered, options)
      const blob = new Blob([formatted.content], { type: formatted.mime })

      return ok({
        blob,
        filename: formatted.filename,
        recordCount: filtered.length,
        totalSize: blob.size,
        format: options.format
      })
    } catch (error) {
      return err(
        createLlmError('EXPORT_FAILED', 'LLM export failed', {
          message: error instanceof Error ? error.message : String(error)
        })
      )
    }
  }

  private formatRecords(
    records: LLMRecord[],
    options: ExportOptions
  ): { content: string; filename: string; mime: string } {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
    if (options.format === 'jsonl') {
      return {
        content: formatJsonl(records, options),
        filename: `moyin_llm_${timestamp}.jsonl`,
        mime: 'application/jsonl'
      }
    }
    if (options.format === 'openai') {
      return {
        content: formatOpenAI(records, options),
        filename: `moyin_llm_${timestamp}.json`,
        mime: 'application/json'
      }
    }
    if (options.format === 'all') {
      const content = JSON.stringify(
        {
          jsonl: formatJsonl(records, options),
          json: JSON.parse(formatJson(records, options)),
          openai: JSON.parse(formatOpenAI(records, options))
        },
        null,
        options.prettyPrint ? 2 : 0
      )
      return {
        content,
        filename: `moyin_llm_${timestamp}.json`,
        mime: 'application/json'
      }
    }
    return {
      content: formatJson(records, options),
      filename: `moyin_llm_${timestamp}.json`,
      mime: 'application/json'
    }
  }
}
