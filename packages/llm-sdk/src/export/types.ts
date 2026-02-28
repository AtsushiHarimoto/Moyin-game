/**
 * 導出服務型別
 * 用途：定義導出選項與結果結構。
 */
import type { QualityFilter } from '../quality/types'

export type ExportOptions = {
  format: 'jsonl' | 'json' | 'openai' | 'all'
  filter?: QualityFilter
  dateRange?: { start: number; end: number }
  sessionIds?: string[]
  includeRaw: boolean
  includeRepairs: boolean
  includeContext: boolean
  prettyPrint: boolean
}

export type ExportResult = {
  blob: Blob
  filename: string
  recordCount: number
  totalSize: number
  format: string
}
