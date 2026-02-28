/**
 * LLM 調度器
 * 用途：統一處理 LLM 調用、修復、記錄與 fallback。
 */
import { LLMAdapterFactory } from '../adapters/index'
import type { LLMMessage, LLMProvider } from '../adapters/types'
import { ContextCompressor, SummaryGenerator } from '../context/index'
import type { CompressionConfig } from '../context/index'
import { JsonRepairLayer } from '../repair/index'
import { RecordingLayer } from '../recording/index'
import type { LLMRecord, LlmRecordStatus } from '../recording/types'
import { QualityScorer } from '../quality/index'
import { StreamingHandler } from '../streaming/index'
import type { StreamConfig } from '../streaming/index'
import { createId } from '../shared/id'
import { createLlmError, type LlmError } from '../shared/errors'
import { err, ok, isErr, type Result } from '../shared/result'
import { FallbackChain } from './fallback'
import { RetryStrategy } from './retry'
import type {
  OrchestratorConfig,
  OrchestratorResult,
  ProviderConfig
} from './types'
import type { LlmTurnRequest } from '../shared/llm-types'

const DEFAULT_COMPRESSION: CompressionConfig = {
  maxContextTokens: 8000,
  summaryThreshold: 6000,
  keepRecentTurns: 3,
  compressionRatio: 0.3
}

/**
 * 類：LLMOrchestrator
 * 用途：封裝 LLM 調度邏輯，整合修復、記錄、品質評分與 fallback。
 */
export class LLMOrchestrator {
  private config: OrchestratorConfig
  private repairLayer: JsonRepairLayer
  private recorder: RecordingLayer
  private qualityScorer: QualityScorer
  private fallbackChain: FallbackChain
  private retryStrategy: RetryStrategy
  private compressor?: ContextCompressor

  constructor(config: OrchestratorConfig) {
    this.config = config
    this.repairLayer = new JsonRepairLayer()
    this.recorder = new RecordingLayer()
    this.qualityScorer = new QualityScorer()
    this.fallbackChain = new FallbackChain(config.providers)
    this.retryStrategy = new RetryStrategy(config.retry)
    if (config.contextEnabled) {
      const summaryProvider = this.resolveSummaryProvider(config.providers)
      this.compressor = new ContextCompressor(
        DEFAULT_COMPRESSION,
        new SummaryGenerator(summaryProvider)
      )
    }
  }

  /**
   * 執行 LLM 調用
   * 用途：完成 prompt、fallback、修復與記錄流程
   *
   * @param request LLM 回合請求
   * @param signal 中止訊號（可選）
   * @returns Result：成功為 OrchestratorResult，失敗為 LlmError
   */
  async execute(
    request: LlmTurnRequest,
    signal?: AbortSignal
  ): Promise<Result<OrchestratorResult, LlmError>> {
    const context = await this.buildContext(request, signal)
    const messages = this.buildMessages(context.systemPrompt, context.userPrompt, context.history)
    const start = Date.now()

    const fallback = await this.fallbackChain.execute(async (provider) => {
      return this.executeWithProvider(provider, messages, request, signal)
    })

    if (!fallback.result.ok) {
      return fallback.result
    }

    const outcome = fallback.result.value
    const latencyMs = Date.now() - start
    const status =
      fallback.attempts.length > 1 ? 'fallback' : outcome.status
    const record = this.buildRecord(
      request,
      messages,
      outcome,
      latencyMs,
      fallback.attempts,
      status,
      context.contextSummary
    )

    await this.recorder.record(record)

    if (outcome.repairActions.length > 0) {
      await this.recorder.recordRepair({
        recordId: record.id,
        success: outcome.validationErrors?.length ? false : true,
        actions: outcome.repairActions,
        validationErrors: outcome.validationErrors
      })
    }

    return ok({
      ...outcome,
      latencyMs,
      fallbackChain: fallback.attempts
    })
  }

  private async executeWithProvider(
    provider: ProviderConfig,
    messages: LLMMessage[],
    request: LlmTurnRequest,
    signal?: AbortSignal
  ): Promise<Result<OrchestratorResult, LlmError>> {
    for (let attempt = 1; attempt <= this.config.retry.maxRetries; attempt += 1) {
      const start = Date.now()
      try {
        const response = await this.callProvider(provider, messages, request, signal)
        const repairResult = this.repairLayer.repair(response.content)
        if (isErr(repairResult)) {
          await this.recorder.recordError({
            recordId: null,
            sessionId: request.sessionId ?? null,
            provider: provider.provider,
            model: provider.modelId,
            errorCode: repairResult.error.code,
            errorMessage: repairResult.error.message,
            requestSnapshot: request
          })
          return err(repairResult.error)
        }

        const repairPayload = repairResult.value
        const parsed = repairPayload.parsed
        const status: LlmRecordStatus = repairPayload.success
          ? repairPayload.repairs.length
            ? 'repaired'
            : 'success'
          : 'failed'

        if (!repairPayload.success || !parsed) {
          const error = createLlmError(
            'JSON_REPAIR_FAILED',
            'JSON repair failed',
            { validationErrors: repairPayload.validationErrors }
          )
          await this.recorder.recordError({
            recordId: null,
            sessionId: request.sessionId ?? null,
            provider: provider.provider,
            model: provider.modelId,
            errorCode: error.code,
            errorMessage: error.message,
            requestSnapshot: request,
            meta: error.meta
          })
          return err(error)
        }

        const rawText = repairPayload.repairedContent || response.content
        return ok({
          rawText,
          parsed,
          repaired: repairPayload.repairs.length > 0,
          repairActions: repairPayload.repairs,
          provider: provider.provider,
          model: provider.modelId,
          usage: response.usage,
          latencyMs: Date.now() - start,
          status: status === 'failed' ? 'fallback' : status,
          fallbackChain: [],
          validationErrors: repairPayload.validationErrors
        })
      } catch (error) {
        if (this.retryStrategy.canRetry(attempt)) {
          await this.retryStrategy.wait(attempt)
          continue
        }
        const classified = this.classifyError(error)
        await this.recorder.recordError({
          recordId: null,
          sessionId: request.sessionId ?? null,
          provider: provider.provider,
          model: provider.modelId,
          errorCode: classified.code,
          errorMessage: classified.message,
          requestSnapshot: request,
          meta: classified.meta
        })
        return err(classified)
      }
    }

    return err(
      createLlmError('PROVIDER_UNAVAILABLE', 'Provider retries exhausted')
    )
  }

  private async callProvider(
    provider: ProviderConfig,
    messages: LLMMessage[],
    request: LlmTurnRequest,
    signal?: AbortSignal
  ) {
    const adapter = LLMAdapterFactory.create(
      provider.provider,
      provider.modelId,
      provider.apiKey,
      provider.baseUrl
    )
    const options = {
      messages,
      temperature: request.temperature ?? 0.8,
      maxTokens: request.maxTokens ?? 1200,
      locale: request.locale,
      stream: false,
      signal,
      timeoutMs: this.config.timeout.requestTimeoutMs
    }

    if (this.config.streamEnabled && request.stream) {
      const streamConfig: StreamConfig = {
        enabled: true,
        chunkDelayMs: 0,
        showPartialJson: false
      }
      const handler = new StreamingHandler(streamConfig)
      const streamed = await handler.streamWithProgress(adapter, {
        ...options,
        stream: true
      })
      return {
        content: streamed.rawText,
        usage: undefined,
        finishReason: 'stop'
      }
    }

    return adapter.chat(options)
  }

  private buildRecord(
    request: LlmTurnRequest,
    messages: LLMMessage[],
    outcome: OrchestratorResult,
    latencyMs: number,
    fallbackChain: string[],
    status: LlmRecordStatus,
    contextSummary?: string
  ): LLMRecord {
    const systemPrompt = messages.find((msg) => msg.role === 'system')?.content || ''
    const lastUserMessage = messages.filter((msg) => msg.role === 'user').slice(-1)[0]
    const userPrompt = request.userPrompt || lastUserMessage?.content || ''

    return {
      id: createId('llm_record'),
      sessionId: request.sessionId ?? null,
      turnIndex: request.turnIndex ?? null,
      timestamp: Date.now(),
      provider: outcome.provider,
      model: outcome.model ?? null,
      status,
      request: {
        systemPrompt,
        userPrompt,
        contextSummary,
        fullContext: messages,
        turnContext: request
      },
      response: {
        raw: outcome.rawText,
        parsed: outcome.parsed,
        repairAttempts: outcome.repairActions.length,
        repairedContent: outcome.repaired ? outcome.rawText : undefined
      },
      meta: {
        latencyMs,
        promptTokens: outcome.usage?.promptTokens,
        completionTokens: outcome.usage?.completionTokens,
        status,
        fallbackChain,
        errorMessage: outcome.validationErrors?.join('; ')
      },
      quality: {
        autoScore: outcome.parsed ? this.qualityScorer.autoScore(outcome.parsed).overall : undefined
      }
    }
  }

  private buildMessages(
    systemPrompt: string,
    userPrompt: string,
    history?: LLMMessage[]
  ): LLMMessage[] {
    const messages: LLMMessage[] = [{ role: 'system', content: systemPrompt }]
    if (history?.length) messages.push(...history)
    messages.push({ role: 'user', content: userPrompt })
    return messages
  }

  private async buildContext(
    request: LlmTurnRequest,
    signal?: AbortSignal
  ): Promise<{
    systemPrompt: string
    userPrompt: string
    history: LLMMessage[]
    contextSummary?: string
  }> {
    const systemPrompt = request.systemPrompt || this.defaultSystemPrompt()
    const userPrompt = request.userPrompt || this.defaultUserPrompt(request)

    if (!this.compressor || !request.sessionId) {
      return { systemPrompt, userPrompt, history: [], contextSummary: undefined }
    }

    let compressedHistory: Awaited<ReturnType<ContextCompressor['compress']>> | null = null
    try {
      const historyMessages = await this.loadHistoryMessages(request.sessionId)
      compressedHistory = await this.compressor.compress(
        historyMessages,
        request.locale || 'zh-TW',
        signal
      )
    } catch (error) {
      await this.recorder.recordError({
        recordId: null,
        sessionId: request.sessionId,
        provider: null,
        model: null,
        errorCode: 'CONTEXT_COMPRESSION_FAILED',
        errorMessage: 'Context compression failed',
        requestSnapshot: request,
        meta: {
          message: error instanceof Error ? error.message : String(error)
        }
      })
      compressedHistory = null
    }

    const summaryBlock = compressedHistory?.summary
      ? `【歷史摘要】\n${compressedHistory.summary}\n`
      : ''

    const mergedSystem = summaryBlock ? `${systemPrompt}\n\n${summaryBlock}` : systemPrompt
    return {
      systemPrompt: mergedSystem,
      userPrompt,
      history: compressedHistory?.recentTurns || [],
      contextSummary: compressedHistory?.summary || undefined
    }
  }

  private async loadHistoryMessages(sessionId: string): Promise<LLMMessage[]> {
    const records = await this.recorder.list({ sessionIds: [sessionId] })
    return records
      .sort((a, b) => a.timestamp - b.timestamp)
      .flatMap((record) => {
        const assistantContent =
          record.response.repairedContent || record.response.raw
        return [
          { role: 'user' as const, content: record.request.userPrompt },
          { role: 'assistant' as const, content: assistantContent }
        ]
      })
  }

  private defaultSystemPrompt(): string {
    return [
      '你是一個視覺小說遊戲的 LLM 核心。',
      '請嚴格輸出 JSON，並符合以下結構：',
      '{',
      '  "meta": { "conversation_id": "string", "response_id": "string", "candidate_id": "string", "protocolVersion": "v1" },',
      '  "frames": [ { "id": "string", "speaker": "string", "text": "string", "canNext": true } ],',
      '  "proposals": [],',
      '  "stageHints": null,',
      '  "provider": "string",',
      '  "model": "string|null"',
      '}'
    ].join('\n')
  }

  private defaultUserPrompt(request: LlmTurnRequest): string {
    const parts = [
      `【場景】${request.sceneId}`,
      `【章節】${request.chapterId || ''}`,
      `【輸入類型】${request.inputType}`,
      request.text ? `【玩家輸入】${request.text}` : '',
      request.chipId ? `【動作】${request.chipId}` : '',
      request.targetCharId ? `【目標角色】${request.targetCharId}` : '',
      request.historySummary ? `【歷史摘要】${request.historySummary}` : '',
      request.memoryContext ? request.memoryContext : ''
    ].filter((line) => line.length > 0)

    return `${parts.join('\n')}\n\n請輸出下一回合 JSON。`
  }

  private classifyError(error: unknown): LlmError {
    const message = error instanceof Error ? error.message : String(error)
    if (message.toLowerCase().includes('timeout')) {
      return createLlmError('TIMEOUT', 'LLM request timeout', { message })
    }
    if (message.toLowerCase().includes('rate')) {
      return createLlmError('RATE_LIMIT', 'LLM rate limit', { message })
    }
    if (message.toLowerCase().includes('401') || message.toLowerCase().includes('auth')) {
      return createLlmError('AUTH_ERROR', 'LLM auth error', { message })
    }
    if (message.toLowerCase().includes('500') || message.toLowerCase().includes('server')) {
      return createLlmError('SERVER_ERROR', 'LLM server error', { message })
    }
    return createLlmError('NETWORK_ERROR', 'LLM network error', { message })
  }

  private resolveSummaryProvider(providers: ProviderConfig[]): {
    provider: LLMProvider
    modelId: string
    apiKey: string
    baseUrl?: string
  } {
    const ordered = [...providers].sort((a, b) => a.priority - b.priority)
    const candidate = ordered[0]
    if (!candidate) {
      throw new Error('No LLM provider configured')
    }
    return {
      provider: candidate.provider,
      modelId: candidate.modelId,
      apiKey: candidate.apiKey,
      baseUrl: candidate.baseUrl
    }
  }
}
