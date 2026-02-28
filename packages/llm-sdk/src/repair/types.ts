/**
 * JSON 修復型別定義
 * 用途：描述修復動作與修復結果。
 */

/**
 * 修復動作
 * 用途：記錄單次修復的策略與細節。
 */
export type RepairAction =
  | { type: 'extract_json_block'; note?: string }
  | { type: 'fix_trailing_comma' }
  | { type: 'fix_unclosed_brackets'; addedBraces: number; addedBrackets: number }
  | { type: 'fix_unescaped_quotes' }
  | { type: 'add_missing_field'; field: string; defaultValue: unknown }

/**
 * 修復結果
 * 用途：描述修復是否成功與產物。
 */
export type RepairResult<T> = {
  success: boolean
  original: string
  repaired?: string
  repairedContent?: string
  parsed?: T
  repairs: RepairAction[]
  validationErrors?: string[]
}
