/**
 * 流式處理器
 * 用途：處理 LLM 流式回應並提供進度回調。
 */
import type { LLMRequestOptions, BaseLLMAdapter } from '../adapters/types'
import type { LlmRawFrame, LlmResponse } from '../shared/llm-types'
import { IncrementalJsonParser } from './IncrementalParser'
import type { StreamConfig } from './types'

/**
 * 類：StreamingHandler
 * 用途：封裝流式讀取與解析流程。
 */
export class StreamingHandler {
  private config: StreamConfig
  private parser: IncrementalJsonParser

  constructor(config: StreamConfig, parser?: IncrementalJsonParser) {
    this.config = config
    this.parser = parser || new IncrementalJsonParser()
  }

  /**
   * 執行流式請求並回傳最終結果
   * 用途：逐段讀取並嘗試增量解析
   *
   * @param adapter LLM 適配器
   * @param options LLM 請求參數
   * @param onChunk 流式片段回調
   * @param onFrame 解析完成幀回調
   * @returns 最終解析結果
   */
  async streamWithProgress(
    adapter: BaseLLMAdapter,
    options: LLMRequestOptions,
    onChunk?: (chunk: string) => void,
    onFrame?: (frame: LlmRawFrame) => void
  ): Promise<{ rawText: string; parsed?: LlmResponse }> {
    const startTime = Date.now()
    let buffer = ''

    this.config.progressCallback?.({
      phase: 'connecting',
      receivedChars: 0,
      elapsedMs: 0
    })

    await adapter.stream(
      options,
      (chunk, done) => {
        if (done) return
        buffer += chunk
        onChunk?.(chunk)
        const parsed = this.parser.tryParse(buffer)
        if (parsed.completedFrames.length) {
          parsed.completedFrames.forEach((frame) => onFrame?.(frame))
        }
        this.config.progressCallback?.({
          phase: 'receiving',
          receivedChars: buffer.length,
          partialFrames: parsed.partialFrames,
          elapsedMs: Date.now() - startTime
        })
      }
    )

    this.config.progressCallback?.({
      phase: 'parsing',
      receivedChars: buffer.length,
      elapsedMs: Date.now() - startTime
    })

    const parsed = this.parser.tryParse(buffer)
    this.config.progressCallback?.({
      phase: 'done',
      receivedChars: buffer.length,
      elapsedMs: Date.now() - startTime
    })

    return {
      rawText: buffer,
      parsed: parsed.isComplete && parsed.parsed ? (parsed.parsed as LlmResponse) : undefined
    }
  }
}
