/**
 * LLM 記錄存取層
 * 用途：負責 LLM 記錄的寫入與查詢。
 *
 * 遷移說明：移除了 Dexie (IndexedDB) 依賴，
 * 改為純記憶體存儲。消費者可繼承此類並覆寫方法
 * 以接入任意持久化後端（IndexedDB、SQLite 等）。
 */
import { createLlmError, type LlmError } from '../shared/errors'
import { err, ok, type Result } from '../shared/result'
import type {
  LLMErrorRecord,
  LLMRecord,
  LLMRepairRecord,
  QualityRating
} from './types'

/**
 * 查詢選項
 * 用途：定義 LLM 記錄查詢條件。
 */
export type RecordQueryOptions = {
  dateRange?: { start: number; end: number }
  sessionIds?: string[]
  statusFilter?: Array<'success' | 'repaired' | 'failed' | 'fallback'>
  minAutoScore?: number
  minManualScore?: number
  includeTags?: string[]
  excludeTags?: string[]
}

/**
 * 類：RecordStore
 * 用途：提供 LLM 記錄讀寫接口（預設為記憶體存儲）。
 *
 * 遷移說明：原始版本使用 Dexie (IndexedDB)，
 * 已改為記憶體陣列。消費者可繼承覆寫以接入持久化層。
 */
export class RecordStore {
  protected records: LLMRecord[] = []
  protected errors: LLMErrorRecord[] = []
  protected repairs: LLMRepairRecord[] = []
  protected ratings: QualityRating[] = []

  /**
   * 新增 LLM 記錄
   * 用途：保存完整的 LLM 調用資料
   *
   * @param record LLM 記錄
   * @returns Result：成功為記錄本身，失敗為 LlmError
   */
  async addRecord(record: LLMRecord): Promise<Result<LLMRecord, LlmError>> {
    try {
      this.records.push(record)
      return ok(record)
    } catch (error) {
      return err(
        createLlmError('RECORDING_FAILED', 'LLM record write failed', {
          message: error instanceof Error ? error.message : String(error)
        })
      )
    }
  }

  /**
   * 新增錯誤記錄
   * 用途：保存 LLM 調用失敗記錄
   *
   * @param record 錯誤記錄
   * @returns Result：成功為記錄本身，失敗為 LlmError
   */
  async addError(record: LLMErrorRecord): Promise<Result<LLMErrorRecord, LlmError>> {
    try {
      this.errors.push(record)
      return ok(record)
    } catch (error) {
      return err(
        createLlmError('RECORDING_FAILED', 'LLM error record write failed', {
          message: error instanceof Error ? error.message : String(error)
        })
      )
    }
  }

  /**
   * 新增修復記錄
   * 用途：保存 JSON 修復過程
   *
   * @param record 修復記錄
   * @returns Result：成功為記錄本身，失敗為 LlmError
   */
  async addRepair(record: LLMRepairRecord): Promise<Result<LLMRepairRecord, LlmError>> {
    try {
      this.repairs.push(record)
      return ok(record)
    } catch (error) {
      return err(
        createLlmError('RECORDING_FAILED', 'LLM repair record write failed', {
          message: error instanceof Error ? error.message : String(error)
        })
      )
    }
  }

  /**
   * 新增品質評分
   * 用途：保存手動評分與標籤
   *
   * @param rating 品質評分
   * @returns Result：成功為評分本身，失敗為 LlmError
   */
  async addRating(rating: QualityRating): Promise<Result<QualityRating, LlmError>> {
    try {
      this.ratings.push(rating)
      return ok(rating)
    } catch (error) {
      return err(
        createLlmError('RECORDING_FAILED', 'LLM rating write failed', {
          message: error instanceof Error ? error.message : String(error)
        })
      )
    }
  }

  /**
   * 查詢記錄
   * 用途：依條件過濾 LLM 記錄，用於導出與分析。
   *
   * @param options 查詢條件
   * @returns 記錄列表
   */
  async queryRecords(options: RecordQueryOptions = {}): Promise<LLMRecord[]> {
    let result = [...this.records]

    if (options.sessionIds?.length) {
      const allowed = new Set(options.sessionIds)
      result = result.filter((record) =>
        record.sessionId ? allowed.has(record.sessionId) : false
      )
    }

    if (options.dateRange) {
      const { start, end } = options.dateRange
      result = result.filter(
        (record) => record.timestamp >= start && record.timestamp <= end
      )
    }

    if (options.statusFilter?.length) {
      const allowed = new Set(options.statusFilter)
      result = result.filter((record) => allowed.has(record.status))
    }

    if (typeof options.minAutoScore === 'number') {
      result = result.filter(
        (record) => (record.quality?.autoScore ?? -1) >= options.minAutoScore!
      )
    }

    if (typeof options.minManualScore === 'number') {
      result = result.filter(
        (record) => (record.quality?.manualScore ?? -1) >= options.minManualScore!
      )
    }

    if (options.includeTags?.length) {
      result = result.filter((record) => {
        const tags = record.quality?.tags || []
        return options.includeTags!.every((tag) => tags.includes(tag))
      })
    }

    if (options.excludeTags?.length) {
      result = result.filter((record) => {
        const tags = record.quality?.tags || []
        return !options.excludeTags!.some((tag) => tags.includes(tag))
      })
    }

    return result
  }
}
