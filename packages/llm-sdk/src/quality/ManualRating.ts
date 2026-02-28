/**
 * 手動評分工具
 * 用途：建立手動評分資料結構。
 */
import type { QualityRating } from '../recording/types'

/**
 * 建立手動評分
 * 用途：整理手動評分資料
 *
 * @param recordId 記錄 ID
 * @param score 評分（1-5）
 * @param tags 標籤（可選）
 * @param notes 備註（可選）
 * @returns QualityRating
 */
export const createManualRating = (
  recordId: string,
  score: 1 | 2 | 3 | 4 | 5,
  tags?: string[],
  notes?: string
): QualityRating => ({
  id: '',
  recordId,
  timestamp: 0,
  score,
  tags,
  notes
})
