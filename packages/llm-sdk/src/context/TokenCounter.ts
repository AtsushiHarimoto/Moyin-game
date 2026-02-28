/**
 * Token 計數器
 * 用途：估算文本 Token 數量。
 */

/**
 * 類：TokenCounter
 * 用途：提供簡易 Token 估算方法（字元數/4）。
 */
export class TokenCounter {
  /**
   * 估算文字 Token 數
   * 用途：以粗略比例估算 token，用於壓縮決策
   *
   * @param text 文本內容
   * @returns 估算 token 數
   */
  estimate(text: string): number {
    if (!text) return 0

    // Count CJK characters (each ~1-2 tokens) separately from ASCII (~4 chars per token)
    let cjkCount = 0
    let asciiCount = 0
    for (const char of text) {
      const code = char.codePointAt(0) ?? 0
      if (code > 0x2E80) {
        cjkCount++
      } else {
        asciiCount++
      }
    }
    return Math.ceil(cjkCount * 1.5 + asciiCount / 4)
  }
}
