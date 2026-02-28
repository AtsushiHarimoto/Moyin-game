/**
 * JSON 區塊提取策略
 * 用途：從 markdown 代碼塊或文字中提取 JSON 內容。
 */

/**
 * 提取 JSON 區塊
 * 用途：優先從 ```json 代碼塊中提取，否則嘗試截取第一個 { 與最後一個 }。
 *
 * @param source 原始字串
 * @returns 提取後的 JSON 字串（若無則回傳原字串）
 */
export const extractJsonBlock = (source: string): string => {
  const fenceMatch = source.match(/```json\s*([\s\S]*?)```/i)
  if (fenceMatch && fenceMatch[1]) {
    return fenceMatch[1].trim()
  }

  const genericFence = source.match(/```\s*([\s\S]*?)```/i)
  if (genericFence && genericFence[1]) {
    return genericFence[1].trim()
  }

  const firstBrace = source.indexOf('{')
  const lastBrace = source.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return source.slice(firstBrace, lastBrace + 1)
  }

  return source
}
