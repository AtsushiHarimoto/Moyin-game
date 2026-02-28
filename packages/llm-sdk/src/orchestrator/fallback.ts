/**
 * Fallback 鏈
 * 用途：依序嘗試多個提供商，直到成功。
 */
import type { ProviderConfig } from './types'
import { err, type Result } from '../shared/result'
import { createLlmError, type LlmError } from '../shared/errors'

export type FallbackResult<T> = {
  result: Result<T, LlmError>
  attempts: string[]
}

/**
 * 類：FallbackChain
 * 用途：封裝提供商鏈的順序與嘗試記錄。
 */
export class FallbackChain {
  private chain: ProviderConfig[]

  constructor(chain: ProviderConfig[]) {
    this.chain = [...chain].sort((a, b) => a.priority - b.priority)
  }

  /**
   * 執行 fallback 鏈
   * 用途：依序嘗試 provider，成功即停止
   *
   * @param handler 呼叫提供商的方法
   * @returns FallbackResult
   */
  async execute<T>(
    handler: (provider: ProviderConfig) => Promise<Result<T, LlmError>>
  ): Promise<FallbackResult<T>> {
    const attempts: string[] = []
    let lastResult: Result<T, LlmError> | null = null

    for (const provider of this.chain) {
      attempts.push(`${provider.provider}:${provider.modelId}`)
      const result = await handler(provider)
      if (result.ok) {
        return { result, attempts }
      }
      lastResult = result
    }

    return {
      result: lastResult || err(createLlmError('PROVIDER_UNAVAILABLE', 'All providers failed')),
      attempts
    }
  }
}
