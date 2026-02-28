/**
 * 括號補全策略
 * 用途：修復缺少的 } 或 ]。
 */

/**
 * 補全缺失的括號
 * 用途：根據左右括號數量差異進行補全
 *
 * @param source 原始字串
 * @returns 修復後字串與補全數量
 */
export const fixUnclosedBrackets = (
  source: string
): { repaired: string; addedBraces: number; addedBrackets: number } => {
  const openBraces = (source.match(/{/g) || []).length
  const closeBraces = (source.match(/}/g) || []).length
  const openBrackets = (source.match(/\[/g) || []).length
  const closeBrackets = (source.match(/\]/g) || []).length

  const addedBraces = Math.max(0, openBraces - closeBraces)
  const addedBrackets = Math.max(0, openBrackets - closeBrackets)

  const repaired =
    source + '}'.repeat(addedBraces) + ']'.repeat(addedBrackets)

  return { repaired, addedBraces, addedBrackets }
}
