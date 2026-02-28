/**
 * 引號修復策略
 * 用途：將常見的智能引號轉換為 JSON 可解析的引號。
 */

/**
 * 修復智能引號
 * 用途：替換 \u201c \u201d 為 "，替換 \u2018 \u2019 為 '
 *
 * @param source 原始字串
 * @returns 修復後字串
 */
export const fixSmartQuotes = (source: string): string => {
  return source
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
}
