import { create } from 'zustand'
import { getStoredString, getStoredObject } from '@/lib/storage'
import type { LLMProvider } from '@moyin/llm-sdk'

/**
 * LLM model descriptor used for provider/model selection.
 */
export interface LLMModel {
  id: string
  name: string
  provider: LLMProvider
  description?: string
  maxTokens?: number
  contextWindow?: number
}

/**
 * Per-model invocation count map.
 */
type ModelUsage = Record<string, number>

// ── State ───────────────────────────────────────────────────

export interface LlmState {
  currentProvider: LLMProvider
  currentModelId: string
  models: LLMModel[]
  usage: ModelUsage
}

// ── Actions ─────────────────────────────────────────────────

export interface LlmActions {
  setProvider: (provider: LLMProvider) => void
  setModel: (modelId: string) => void
  incrementUsage: (modelId: string) => void
  resetUsage: () => void
  addCustomModel: (model: LLMModel) => void
  removeCustomModel: (modelId: string) => void
  setModels: (models: LLMModel[]) => void
}

// ── Predefined models ───────────────────────────────────────

const AVAILABLE_MODELS: LLMModel[] = [
  // Google Gemini
  {
    id: 'gemini-2.0-flash-exp',
    name: 'Gemini 2.0 Flash (Experimental)',
    provider: 'google',
    description: '最新實驗版本，速度快',
    maxTokens: 8192,
    contextWindow: 1_000_000,
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'google',
    description: '高性能版本',
    maxTokens: 8192,
    contextWindow: 2_000_000,
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'google',
    description: '快速版本',
    maxTokens: 8192,
    contextWindow: 1_000_000,
  },

  // xAI Grok
  {
    id: 'grok-2-1212',
    name: 'Grok 2 (Dec 2024)',
    provider: 'xai',
    description: '最新版本 Grok',
    maxTokens: 4096,
    contextWindow: 131_072,
  },

  // Ollama (local)
  {
    id: 'llama3',
    name: 'Llama 3',
    provider: 'ollama',
    description: '本地運行',
    maxTokens: 2048,
    contextWindow: 8192,
  },
  {
    id: 'mistral',
    name: 'Mistral',
    provider: 'ollama',
    description: '本地運行',
    maxTokens: 2048,
    contextWindow: 8192,
  },
  {
    id: 'qwen2.5',
    name: 'Qwen 2.5',
    provider: 'ollama',
    description: '本地運行（支持中文）',
    maxTokens: 2048,
    contextWindow: 32_768,
  },

  // ChatGPT
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'chatgpt',
    description: 'OpenAI 旗艦模型',
    maxTokens: 4096,
    contextWindow: 128_000,
  },
  {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'chatgpt',
    description: 'OpenAI 強大模型',
    maxTokens: 8192,
    contextWindow: 32_768,
  },
  {
    id: 'o1-preview',
    name: 'o1 Preview',
    provider: 'chatgpt',
    description: 'OpenAI 推理模型',
    maxTokens: 8192,
    contextWindow: 128_000,
  },
]

// ── Helpers ─────────────────────────────────────────────────

function findModel(models: LLMModel[], modelId: string): LLMModel | undefined {
  return models.find((m) => m.id === modelId)
}

function persistProvider(provider: string): void {
  localStorage.setItem('llm_current_provider', provider)
}

function persistModel(modelId: string): void {
  localStorage.setItem('llm_current_model', modelId)
}

const KNOWN_PROVIDERS: LLMProvider[] = ['google', 'xai', 'chatgpt', 'ollama']

function parseProvider(value: string, fallback: LLMProvider): LLMProvider {
  return KNOWN_PROVIDERS.includes(value as LLMProvider) ? (value as LLMProvider) : fallback
}

function persistUsage(usage: ModelUsage): void {
  localStorage.setItem('llm_usage', JSON.stringify(usage))
}

// ── Store ───────────────────────────────────────────────────

export const useLlmStore = create<LlmState & LlmActions>()((set, get) => ({
  // --- State ---
  currentProvider: parseProvider(getStoredString('llm_current_provider', 'xai'), 'xai'),
  currentModelId: getStoredString('llm_current_model', 'grok-2-1212'),
  models: [...AVAILABLE_MODELS],
  usage: getStoredObject<ModelUsage>('llm_usage', {}),

  // --- Actions ---

  setProvider: (provider) => {
    set((state) => {
      const current = findModel(state.models, state.currentModelId)
      const needSwitch = !current || current.provider !== provider
      const fallback = needSwitch
        ? state.models.find((m) => m.provider === provider)
        : undefined

      const nextModelId = fallback ? fallback.id : state.currentModelId

      persistProvider(provider)
      if (fallback) persistModel(nextModelId)

      return { currentProvider: provider, currentModelId: nextModelId }
    })
  },

  setModel: (modelId) => {
    const model = findModel(get().models, modelId)
    if (!model) {
      console.warn(`[LLM Store] Model not found: ${modelId}`)
      return
    }
    persistModel(modelId)
    persistProvider(model.provider)
    set({ currentModelId: modelId, currentProvider: model.provider })
  },

  incrementUsage: (modelId) => {
    set((state) => {
      const next = { ...state.usage, [modelId]: (state.usage[modelId] ?? 0) + 1 }
      persistUsage(next)
      return { usage: next }
    })
  },

  resetUsage: () => {
    localStorage.removeItem('llm_usage')
    set({ usage: {} })
  },

  addCustomModel: (model) => {
    set((state) => {
      if (state.models.some((m) => m.id === model.id)) {
        console.warn(`[LLM Store] Model already exists: ${model.id}`)
        return state
      }
      return { models: [...state.models, model] }
    })
  },

  removeCustomModel: (modelId) => {
    set((state) => {
      const idx = state.models.findIndex((m) => m.id === modelId)
      if (idx === -1) {
        console.warn(`[LLM Store] Model not found: ${modelId}`)
        return state
      }

      const next = state.models.filter((m) => m.id !== modelId)
      const updates: Partial<LlmState> = { models: next }

      if (state.currentModelId === modelId && next.length > 0) {
        const fallback = next[0]
        updates.currentModelId = fallback.id
        updates.currentProvider = fallback.provider
        persistModel(fallback.id)
        persistProvider(fallback.provider)
      }

      return updates
    })
  },

  setModels: (models) => {
    if (!models.length) {
      console.warn('[LLM Store] Empty models list, keeping existing models')
      return
    }

    set((state) => {
      const current = models.find((m) => m.id === state.currentModelId)
      if (current) {
        return { models, currentProvider: current.provider }
      }

      const providerMatch = models.find((m) => m.provider === state.currentProvider)
      const fallback = providerMatch ?? models[0]

      persistModel(fallback.id)
      persistProvider(fallback.provider)

      return {
        models,
        currentModelId: fallback.id,
        currentProvider: fallback.provider,
      }
    })
  },
}))

// ── Derived selectors (call outside of store) ───────────────

/**
 * Returns the full LLMModel object for the current selection,
 * or undefined if the model list has not been loaded yet.
 */
export function selectCurrentModel(state: LlmState): LLMModel | undefined {
  return state.models.find((m) => m.id === state.currentModelId)
}

/**
 * Returns models filtered by a specific provider.
 */
export function selectModelsByProvider(
  state: LlmState,
  provider: LLMProvider,
): LLMModel[] {
  return state.models.filter((m) => m.provider === provider)
}
