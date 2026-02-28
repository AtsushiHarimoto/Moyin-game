/**
 * 增量 JSON 解析器
 * 用途：嘗試從流式輸出中解析已完成的 JSON。
 */
import type { LlmRawFrame, LlmRawResponse } from '../shared/llm-types'

const safeParse = (input: string): LlmRawResponse | null => {
  try {
    return JSON.parse(input) as LlmRawResponse
  } catch {
    return null
  }
}

/**
 * 類：IncrementalJsonParser
 * 用途：提供增量解析能力，當 JSON 完整時輸出 frames。
 */
export class IncrementalJsonParser {
  /**
   * 嘗試解析流式 buffer
   * 用途：在 JSON 完整時輸出 completedFrames
   *
   * @param buffer 目前累積的字串
   * @returns 完成幀與解析狀態
   */
  tryParse(buffer: string): {
    completedFrames: LlmRawFrame[]
    partialFrames: Partial<LlmRawFrame>[]
    isComplete: boolean
    parsed?: LlmRawResponse
  } {
    const candidate = this.extractCandidate(buffer)
    if (!candidate) {
      return { completedFrames: [], partialFrames: [], isComplete: false }
    }
    const parsed = safeParse(candidate)
    if (!parsed) {
      return { completedFrames: [], partialFrames: [], isComplete: false }
    }
    const frames = Array.isArray(parsed.frames) ? parsed.frames : []
    return {
      completedFrames: frames,
      partialFrames: [],
      isComplete: true,
      parsed
    }
  }

  private extractCandidate(buffer: string): string | null {
    const start = buffer.indexOf('{')
    const end = buffer.lastIndexOf('}')
    if (start >= 0 && end > start) {
      return buffer.slice(start, end + 1)
    }
    return null
  }
}
