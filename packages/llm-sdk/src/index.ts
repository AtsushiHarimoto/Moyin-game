/**
 * @moyin/llm-sdk
 * Framework-agnostic LLM integration layer for the Moyin visual novel engine.
 *
 * Migrated from moyin-game-v1 Vue 3 project.
 * All Vue dependencies (ref, reactive, computed, watch) have been removed.
 * All path aliases (@/) have been replaced with relative imports.
 * Dexie (IndexedDB) has been replaced with an in-memory RecordStore (extensible).
 * @microsoft/fetch-event-source has been replaced with native fetch + ReadableStream.
 * Ajv schema validation has been replaced with a pluggable validator (setSchemaValidator).
 */

// ─── Adapters ───────────────────────────────────────────────
export {
  LLMAdapterFactory,
  BaseLLMAdapter,
  GeminiAdapter,
  GrokAdapter,
  OllamaAdapter,
  ChatGPTAdapter
} from './adapters/index'

export type {
  LLMMessage,
  LLMRequestOptions,
  LLMResponse,
  LLMStreamCallback,
  MessageRole,
  LLMProvider
} from './adapters/index'

// ─── Context ────────────────────────────────────────────────
export {
  ContextCompressor,
  SummaryGenerator,
  TokenCounter
} from './context/index'

export type {
  CompressionConfig,
  CompressedContext,
  SummaryProviderConfig
} from './context/index'

// ─── Orchestrator ───────────────────────────────────────────
export {
  LLMOrchestrator,
  FallbackChain,
  RetryStrategy
} from './orchestrator/index'

export type {
  OrchestratorConfig,
  OrchestratorResult,
  ProviderConfig,
  RetryConfig,
  TimeoutConfig
} from './orchestrator/index'

// ─── Prompts ────────────────────────────────────────────────
export { PromptManager, promptManager } from './prompts/manager'

export type {
  PromptTemplate,
  MultiLocalePromptTemplate,
  CompiledPrompt,
  PromptVariables,
  PromptCategory
} from './prompts/types'

// ─── Streaming ──────────────────────────────────────────────
export {
  StreamingHandler,
  IncrementalJsonParser
} from './streaming/index'

export type {
  StreamConfig,
  StreamProgress
} from './streaming/index'

// ─── Quality ────────────────────────────────────────────────
export {
  QualityScorer,
  applyQualityFilter,
  createManualRating
} from './quality/index'

export type {
  AutoScoreResult,
  QualityFlag,
  QualityFilter
} from './quality/index'

// ─── Recording ──────────────────────────────────────────────
export {
  RecordingLayer,
  RecordStore
} from './recording/index'

export type {
  LLMRecord,
  LLMErrorRecord,
  LLMRepairRecord,
  QualityRating,
  LlmRecordStatus,
  RecordQueryOptions
} from './recording/index'

// ─── Export ─────────────────────────────────────────────────
export { ExportService } from './export/index'

export type {
  ExportOptions,
  ExportResult
} from './export/index'

// ─── Repair ─────────────────────────────────────────────────
export {
  JsonRepairLayer,
  validateGameSchema,
  setSchemaValidator,
  resetSchemaValidator
} from './repair/index'

export type {
  RepairAction,
  RepairResult,
  SchemaValidator
} from './repair/index'

// ─── Shared Utilities ───────────────────────────────────────
export { createAbortSignal } from './shared/abort'
export { createId } from './shared/id'
export { createLlmError } from './shared/errors'
export type { LlmError, LlmErrorCode } from './shared/errors'
export { ok, err, isOk, isErr } from './shared/result'
export type { Result } from './shared/result'

// ─── Shared LLM Types ──────────────────────────────────────
export type {
  LlmTurnRequest,
  LlmRawFrame,
  LlmRawResponse,
  LlmResponse,
  LlmProposal,
  StageHints,
  LegacyLlmMeta,
  LegacyPortraitHint,
  ProviderMeta,
  LlmProviderResult
} from './shared/llm-types'

// ─── i18n ───────────────────────────────────────────────────
export { I18nManager, i18n, t } from './i18n/I18nManager'

export type { SupportedLocale, LocaleConfig } from './i18n/config'

export { LOCALE_CONFIG, DEFAULT_LOCALE, LOCALE_STORAGE_KEY } from './i18n/config'
