/**
 * JSON Schema 驗證器
 * 用途：驗證遊戲回合 JSON 格式。
 *
 * 遷移說明：移除了 Ajv 依賴，改用輕量級手動驗證。
 * 消費者可透過 setValidator() 注入自定義驗證器（例如 Ajv）。
 */
import { err, ok, type Result } from '../shared/result'

/**
 * 驗證器函式類型
 * 用途：允許外部注入自定義 schema 驗證
 */
export type SchemaValidator = (data: unknown) => Result<void, string[]>

/**
 * 內建簡易驗證器
 * 用途：檢查 GameTurnResponse 基本結構是否符合
 */
const builtinValidator: SchemaValidator = (data: unknown): Result<void, string[]> => {
  const errors: string[] = []

  if (!data || typeof data !== 'object') {
    return err(['/ must be an object'])
  }

  const obj = data as Record<string, unknown>

  if (!obj.meta || typeof obj.meta !== 'object') {
    errors.push('/meta is required and must be an object')
  }

  if (!Array.isArray(obj.frames)) {
    errors.push('/frames is required and must be an array')
  }

  if (typeof obj.provider !== 'string') {
    errors.push('/provider is required and must be a string')
  }

  return errors.length > 0 ? err(errors) : ok(undefined)
}

let currentValidator: SchemaValidator = builtinValidator

/**
 * 設定自定義驗證器
 * 用途：允許消費者注入 Ajv 等完整 schema 驗證器
 *
 * @param validator 自定義驗證函式
 */
export const setSchemaValidator = (validator: SchemaValidator): void => {
  currentValidator = validator
}

/**
 * 重置為內建驗證器
 * 用途：測試或重置用
 */
export const resetSchemaValidator = (): void => {
  currentValidator = builtinValidator
}

/**
 * 驗證遊戲回合 JSON
 * 用途：檢查是否符合 GameTurnResponse Schema
 *
 * @param data 待驗證資料
 * @returns Result：成功為 ok，失敗為 errors 陣列
 */
export const validateGameSchema = (data: unknown): Result<void, string[]> => {
  return currentValidator(data)
}
