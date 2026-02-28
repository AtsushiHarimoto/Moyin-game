/**
 * 結果型別定義
 * 用途：為 LLM 模組提供統一的 Result<T, E> 結構，避免使用例外流程。
 */

/**
 * 結果型別：表示成功或失敗
 * 用途：統一所有可能失敗的函式回傳格式
 *
 * @template T 成功資料類型
 * @template E 錯誤資料類型
 */
export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E }

/**
 * 型別守衛：判斷 Result 是否為失敗結果
 * 用途：在型別層收斂 error 存取
 *
 * @param result Result 結構
 * @returns 是否為失敗結果
 */
export const isErr = <T, E>(result: Result<T, E>): result is { ok: false; error: E } => {
  return result.ok === false
}

/**
 * 型別守衛：判斷 Result 是否為成功結果
 * 用途：在型別層收斂 value 存取
 *
 * @param result Result 結構
 * @returns 是否為成功結果
 */
export const isOk = <T, E>(result: Result<T, E>): result is { ok: true; value: T } => {
  return result.ok === true
}

/**
 * 建立成功結果
 * 用途：封裝成功資料為 Result
 *
 * @param value 成功資料
 * @returns Result 成功結果
 */
export const ok = <T>(value: T): Result<T, never> => ({
  ok: true,
  value
})

/**
 * 建立失敗結果
 * 用途：封裝錯誤資料為 Result
 *
 * @param error 錯誤資料
 * @returns Result 失敗結果
 */
export const err = <E>(error: E): Result<never, E> => ({
  ok: false,
  error
})
