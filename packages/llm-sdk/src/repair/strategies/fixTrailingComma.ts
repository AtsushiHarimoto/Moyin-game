/**
 * 尾逗號修復策略
 * 用途：移除 JSON 尾逗號，避免解析錯誤。
 */

/**
 * 移除尾逗號
 * 用途：將 } 或 ] 前的多餘逗號移除
 *
 * @param source 原始字串
 * @returns 修復後字串
 */
export const fixTrailingComma = (source: string): string => {
  return source.replace(/,\s*([}\]])/g, '$1')
}
