import { useCallback, useRef, useState } from 'react'
import {
  LLMAdapterFactory,
  promptManager,
  RecordingLayer,
  createId,
  createAbortSignal,
} from '@moyin/llm-sdk'
import type {
  LLMMessage,
  LLMProvider,
  LLMRequestOptions,
  LLMResponse,
  PromptVariables,
  LLMRecord,
} from '@moyin/llm-sdk'
import { useLlmStore, selectCurrentModel } from '@/stores/useLlmStore'

// ── Types ───────────────────────────────────────────────────

export interface UseLlmOptions {
  /** Override default provider when store is not used. */
  defaultProvider?: LLMProvider
  /** Override default model ID when store is not used. */
  defaultModelId?: string
  /** Enable call recording via RecordingLayer. */
  enableRecording?: boolean
  /** Session ID attached to each recording entry. */
  sessionId?: string
}

export interface ChatOptions {
  temperature?: number
  maxTokens?: number
  locale?: string
  provider?: LLMProvider
  modelId?: string
  signal?: AbortSignal
  timeoutMs?: number
}

export interface StreamOptions extends ChatOptions {
  onChunk?: (chunk: string) => void
}

export interface SubmitPromptOptions extends ChatOptions {
  /** Raw messages to send (bypasses prompt compilation). */
  messages?: LLMMessage[]
}

// ── Helpers ─────────────────────────────────────────────────

function resolveApiKey(_provider: LLMProvider): string {
  // API keys are resolved at runtime from environment variables
  // injected by Vite. Consumers can also configure keys via the
  // user store and pass them through the adapter factory.
  switch (_provider) {
    case 'google':
      return import.meta.env.VITE_GEMINI_API_KEY ?? ''
    case 'xai':
      return import.meta.env.VITE_GROK_API_KEY ?? ''
    case 'chatgpt':
      return import.meta.env.VITE_OPENAI_API_KEY ?? ''
    case 'ollama':
      return ''
    default:
      return ''
  }
}

function resolveBaseUrl(provider: LLMProvider): string | undefined {
  if (provider === 'ollama') {
    return import.meta.env.VITE_OLLAMA_BASE_URL ?? 'http://localhost:11434'
  }
  if (provider === 'chatgpt') {
    return import.meta.env.VITE_OPENAI_BASE_URL ?? 'http://localhost:8000'
  }
  return undefined
}

// ── Hook ────────────────────────────────────────────────────

export function useLlm(options: UseLlmOptions = {}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState('')

  const abortRef = useRef<AbortController | null>(null)
  const recorderRef = useRef<RecordingLayer | null>(null)
  if (options.enableRecording && !recorderRef.current) {
    recorderRef.current = new RecordingLayer()
  }

  // ── submitPrompt ────────────────────────────────────────

  const submitPrompt = useCallback(
    async (
      promptId: string,
      variables: PromptVariables,
      opts: SubmitPromptOptions = {},
    ): Promise<string> => {
      setLoading(true)
      setError(null)
      setResult('')
      const start = Date.now()

      const storeState = useLlmStore.getState()
      const currentModel = selectCurrentModel(storeState)
      const provider = opts.provider ?? currentModel?.provider ?? options.defaultProvider ?? 'xai'
      const modelId = opts.modelId ?? currentModel?.id ?? options.defaultModelId ?? 'grok-2-1212'
      const apiKey = resolveApiKey(provider)
      const baseUrl = resolveBaseUrl(provider)

      const abortController = new AbortController()
      abortRef.current = abortController
      const { signal, cleanup } = createAbortSignal(abortController.signal, opts.timeoutMs)

      try {
        let messages: LLMMessage[]
        if (opts.messages) {
          messages = opts.messages
        } else {
          const compiled = promptManager.compile(promptId, variables, opts.locale)
          messages = []
          if (compiled.system) {
            messages.push({ role: 'system', content: compiled.system })
          }
          messages.push({ role: 'user', content: compiled.user })
        }

        const adapter = LLMAdapterFactory.create(provider, modelId, apiKey, baseUrl)

        const requestOptions: LLMRequestOptions = {
          messages,
          temperature: opts.temperature ?? 0.7,
          maxTokens: opts.maxTokens ?? 2000,
          signal,
        }

        const response: LLMResponse = await adapter.chat(requestOptions)
        setResult(response.content)

        // Record
        if (recorderRef.current) {
          const compiled = promptManager.hasTemplate(promptId)
            ? promptManager.compile(promptId, variables, opts.locale)
            : null
          const record: LLMRecord = {
            id: createId('llm_record'),
            sessionId: options.sessionId ?? null,
            turnIndex: null,
            timestamp: Date.now(),
            provider,
            model: modelId,
            status: 'success',
            request: {
              systemPrompt: compiled?.system ?? '',
              userPrompt: compiled?.user ?? messages.map((m) => m.content).join('\n'),
            },
            response: { raw: response.content },
            meta: {
              latencyMs: Date.now() - start,
              promptTokens: response.usage?.promptTokens,
              completionTokens: response.usage?.completionTokens,
              status: 'success',
            },
          }
          await recorderRef.current.record(record)
        }

        // Track usage
        useLlmStore.getState().incrementUsage(modelId)

        return response.content
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Unknown error'
        setError(message)
        throw e
      } finally {
        cleanup()
        setLoading(false)
      }
    },
    [options.defaultProvider, options.defaultModelId, options.sessionId],
  )

  // ── streamPrompt ────────────────────────────────────────

  const streamPrompt = useCallback(
    async (
      promptId: string,
      variables: PromptVariables,
      opts: StreamOptions = {},
    ): Promise<void> => {
      setLoading(true)
      setError(null)
      setResult('')
      const start = Date.now()

      const storeState = useLlmStore.getState()
      const currentModel = selectCurrentModel(storeState)
      const provider = opts.provider ?? currentModel?.provider ?? options.defaultProvider ?? 'xai'
      const modelId = opts.modelId ?? currentModel?.id ?? options.defaultModelId ?? 'grok-2-1212'
      const apiKey = resolveApiKey(provider)
      const baseUrl = resolveBaseUrl(provider)

      const abortController = new AbortController()
      abortRef.current = abortController
      const { signal, cleanup } = createAbortSignal(abortController.signal, opts.timeoutMs)

      let accumulated = ''

      try {
        const compiled = promptManager.compile(promptId, variables, opts.locale)
        const messages: LLMMessage[] = []
        if (compiled.system) {
          messages.push({ role: 'system', content: compiled.system })
        }
        messages.push({ role: 'user', content: compiled.user })

        const adapter = LLMAdapterFactory.create(provider, modelId, apiKey, baseUrl)

        await adapter.stream(
          {
            messages,
            temperature: opts.temperature ?? 0.7,
            maxTokens: opts.maxTokens ?? 2000,
            stream: true,
            signal,
          },
          (chunk, done) => {
            if (!done) {
              accumulated += chunk
              setResult(accumulated)
              opts.onChunk?.(chunk)
            }
          },
        )

        // Record
        if (recorderRef.current) {
          const record: LLMRecord = {
            id: createId('llm_record'),
            sessionId: options.sessionId ?? null,
            turnIndex: null,
            timestamp: Date.now(),
            provider,
            model: modelId,
            status: 'success',
            request: {
              systemPrompt: compiled.system ?? '',
              userPrompt: compiled.user,
            },
            response: { raw: accumulated },
            meta: {
              latencyMs: Date.now() - start,
              status: 'success',
            },
          }
          await recorderRef.current.record(record)
        }

        useLlmStore.getState().incrementUsage(modelId)
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Unknown error'
        setError(message)
        throw e
      } finally {
        cleanup()
        setLoading(false)
      }
    },
    [options.defaultProvider, options.defaultModelId, options.sessionId],
  )

  // ── cancelRequest ───────────────────────────────────────

  const cancelRequest = useCallback((): void => {
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  // ── reset ───────────────────────────────────────────────

  const reset = useCallback((): void => {
    setResult('')
    setError(null)
  }, [])

  return {
    loading,
    error,
    result,
    submitPrompt,
    streamPrompt,
    cancelRequest,
    reset,
  } as const
}
