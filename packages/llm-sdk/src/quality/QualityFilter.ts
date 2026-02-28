/**
 * 品質篩選器
 * 用途：依品質條件過濾 LLM 記錄。
 */
import type { LLMRecord } from '../recording/types'
import type { QualityFilter } from './types'

/**
 * 依品質條件過濾記錄
 * 用途：應用品質分數與標籤規則
 *
 * @param records LLM 記錄列表
 * @param filter 篩選條件
 * @returns 過濾後列表
 */
export const applyQualityFilter = (
  records: LLMRecord[],
  filter?: QualityFilter
): LLMRecord[] => {
  if (!filter) return records
  let result = [...records]

  if (typeof filter.minAutoScore === 'number') {
    result = result.filter(
      (record) => (record.quality?.autoScore ?? -1) >= filter.minAutoScore!
    )
  }

  if (typeof filter.minManualScore === 'number') {
    result = result.filter(
      (record) => (record.quality?.manualScore ?? -1) >= filter.minManualScore!
    )
  }

  if (filter.includeTags?.length) {
    result = result.filter((record) => {
      const tags = record.quality?.tags || []
      return filter.includeTags!.every((tag) => tags.includes(tag))
    })
  }

  if (filter.excludeTags?.length) {
    result = result.filter((record) => {
      const tags = record.quality?.tags || []
      return !filter.excludeTags!.some((tag) => tags.includes(tag))
    })
  }

  if (filter.statusFilter?.length) {
    const allowed = new Set(filter.statusFilter)
    result = result.filter((record) => allowed.has(record.status))
  }

  return result
}
