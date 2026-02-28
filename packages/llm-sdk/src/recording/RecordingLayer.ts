/**
 * LLM 記錄層
 * 用途：提供記錄寫入的高階介面。
 */
import { createId } from '../shared/id'
import type {
  LLMErrorRecord,
  LLMRecord,
  LLMRepairRecord,
  QualityRating
} from './types'
import { RecordStore } from './RecordStore'
import type { Result } from '../shared/result'
import type { LlmError } from '../shared/errors'

/**
 * 類：RecordingLayer
 * 用途：集中處理 LLM 記錄、錯誤與評分的寫入。
 */
export class RecordingLayer {
  private store: RecordStore

  constructor(store?: RecordStore) {
    this.store = store || new RecordStore()
  }

  /**
   * 寫入 LLM 記錄
   * 用途：保存單次 LLM 調用資料
   *
   * @param record LLM 記錄
   * @returns Result：成功為記錄，失敗為 LlmError
   */
  async record(record: LLMRecord): Promise<Result<LLMRecord, LlmError>> {
    return this.store.addRecord(record)
  }

  /**
   * 寫入錯誤記錄
   * 用途：保存錯誤資訊以利追蹤
   *
   * @param record 錯誤記錄
   * @returns Result：成功為記錄，失敗為 LlmError
   */
  async recordError(
    record: Omit<LLMErrorRecord, 'id' | 'timestamp'>
  ): Promise<Result<LLMErrorRecord, LlmError>> {
    const payload: LLMErrorRecord = {
      ...record,
      id: createId('llm_error'),
      timestamp: Date.now()
    }
    return this.store.addError(payload)
  }

  /**
   * 寫入修復記錄
   * 用途：保存 JSON 修復過程
   *
   * @param record 修復記錄
   * @returns Result：成功為記錄，失敗為 LlmError
   */
  async recordRepair(
    record: Omit<LLMRepairRecord, 'id' | 'timestamp'>
  ): Promise<Result<LLMRepairRecord, LlmError>> {
    const payload: LLMRepairRecord = {
      ...record,
      id: createId('llm_repair'),
      timestamp: Date.now()
    }
    return this.store.addRepair(payload)
  }

  /**
   * 寫入品質評分
   * 用途：保存手動品質評分
   *
   * @param rating 品質評分
   * @returns Result：成功為記錄，失敗為 LlmError
   */
  async recordRating(
    rating: Omit<QualityRating, 'id' | 'timestamp'>
  ): Promise<Result<QualityRating, LlmError>> {
    const payload: QualityRating = {
      ...rating,
      id: createId('llm_rating'),
      timestamp: Date.now()
    }
    return this.store.addRating(payload)
  }

  /**
   * 讀取記錄列表
   * 用途：提供導出與分析使用
   *
   * @param options 查詢條件
   * @returns 記錄列表
   */
  async list(options?: Parameters<RecordStore['queryRecords']>[0]): Promise<LLMRecord[]> {
    try {
      return await this.store.queryRecords(options)
    } catch {
      return []
    }
  }
}
