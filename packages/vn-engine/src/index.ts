/**
 * @moyin/vn-engine
 * Framework-agnostic Visual Novel Engine core.
 * Re-exports all public APIs from sub-modules.
 */

// ── Utils ──────────────────────────────────────────────────────────────────
export { EventEmitter } from './utils/EventEmitter';
export type { EventHandler } from './utils/EventEmitter';
export { ok, err, isOk, isErr } from './utils/result';
export type { Ok, Err, Result } from './utils/result';

// ── Database ───────────────────────────────────────────────────────────────
export { MoyinDb, moyinDb, DB_SCHEMA_VERSION } from './db/moyinDb';
export type {
  Phase,
  SessionStatus,
  TurnStatus,
  CommitType,
  ConversationRef,
  SessionRow,
  TurnRow,
  CommitRow,
  EndingUnlockRow,
  SnapshotRow,
  SaveSlotRow,
  StoryPackRow,
  StoryPackStatus,
  TurnInputPayload,
  TurnOutputPayload,
  CommitDelta,
  CommitAudit,
  ModelInfo,
  ProviderMeta as DbProviderMeta,
} from './db/types';

// ── State ──────────────────────────────────────────────────────────────────
export { isPlayerCharId, normalizeRelationships } from './state/normalize';

// ── Providers ──────────────────────────────────────────────────────────────
export { ENTRY_SENTINEL } from './providers/types';
export type {
  Frame,
  EngineFrame,
  PortraitView,
  StageView,
  ChoiceOption,
  ChoiceView,
  TurnContext,
  TurnInput,
  TurnResult,
  TurnProvider,
} from './providers/types';

export type {
  LlmTurnRequest,
  LlmRawFrame,
  LegacyPortraitHint,
  LlmProposal,
  StageHints,
  LlmRawResponse,
  LegacyLlmMeta,
  LlmResponse,
  ProviderMeta,
  LlmProviderResult,
} from './providers/llm/types';

// ── Config ─────────────────────────────────────────────────────────────────
export {
  BindingResolver,
  resolveBindingValue,
  resolveComponentBinding,
  resolveEventBinding,
  resolveStateBinding,
  ConfigEngine,
  TransitionManager,
  resolveTransition,
  buildTransitionStyle,
  FxManager,
  resolveFxPreset,
  LayoutRenderer,
  calculateSlotStyle,
  getResponsiveSlot,
  getLayerZIndex,
} from './config/index';
export type { PerformanceTier, FxFilter } from './config/index';

// ── Providers: Mock ───────────────────────────────────────────────────────
export { mockTurnProvider } from './providers/mockTurnProvider';

// ── Runtime ────────────────────────────────────────────────────────────────
export {
  TALK_RELATIONSHIP_CAP,
  DEFAULT_PLAYER_ID,
  DEFAULT_MAX_FRAMES,
  MAX_FRAME_TEXT,
  TALK_PREVIEW_MAX,
} from './runtime/constants';
export type { ScriptStep } from './runtime/constants';

export {
  VnErrorCode,
  ok as runtimeOk,
  rejected,
  failed,
} from './runtime/runtimeResult';
export type { RuntimeResult } from './runtime/runtimeResult';

export {
  createVnState,
  getCurrentFrame,
} from './runtime/VnState';
export type { VnRuntimeState, ReplayStep, CharacterState, AssetEntry, BacklogItem as VnBacklogItem, PartialSessionMeta } from './runtime/VnState';

export { VnHelper } from './runtime/VnHelper';
export { VnContext } from './runtime/VnContext';
export { VnEvents } from './runtime/VnEvents';

export { VnBacklogManager } from './runtime/VnBacklogManager';
export type { BacklogItem } from './runtime/VnBacklogManager';

export { VnReplayEngine } from './runtime/VnReplayEngine';
export type { VnReplayOptions } from './runtime/VnReplayEngine';

export { VnSessionManager } from './runtime/VnSessionManager';
export type { VnSessionOptions } from './runtime/VnSessionManager';

export { VnTrace } from './runtime/VnTrace';

export { VnExecutionEngine } from './runtime/VnExecutionEngine';
export type {
  SceneConfig,
  ChapterConfig,
  EndingConfig,
  LlmProviderInterface,
  PersistTurnParams,
  TraceEventType,
  TraceEventParams,
  ProviderErrorParams,
  SceneEntryResult,
  VnEngineOptions,
} from './runtime/VnExecutionEngine';

// ── Persistence ────────────────────────────────────────────────────────────
export {
  createSessionFromPack,
  appendTurnCommit,
  listSaveSlots,
  getSaveSlot,
  deleteSaveSlot,
  renameSaveSlot,
  getSessionById,
  listSnapshotsBySessionId,
  saveGame,
  loadGameFork,
  unlockEndingIfNeeded,
  getLatestSessionByStoryKey,
  getTurnsBySessionId,
  getCommitsBySessionId,
  getFramesByCommitId,
  getConversationRef,
  updateConversationLane,
  migrateToDefaultLane,
} from './persistence/vnPersistence';

export {
  dumpSessionToConsole,
  dumpLatestSessionToConsole,
} from './persistence/vnDebug';

// ── Memory ─────────────────────────────────────────────────────────────────
// Public API (re-exported via memory/index.ts barrel)
export {
  MemoryService,
  RemoteMemoryService,
  createMemoryService,
} from './memory';
export type {
  MemoryServicePort,
  CreateMemoryServiceOptions,
} from './memory';

// Memory types
export type {
  ArchivePayload,
  ArchivedTurn,
  CanonConstraint,
  DialogueTurn,
  EmotionCategory,
  EmotionState,
  EmotionType,
  EpisodeSummary,
  MemoryAuditInfo,
  MemoryCanonStatus,
  MemoryConfig,
  MemoryConflictStatus,
  MemoryContext,
  MemoryContextBlock,
  MemoryFact,
  MemoryFactHistory,
  MemoryOwnerScope,
  MemoryStoreMeta,
  SemanticMemory,
  ShortTermMemory,
  ValidationConflict,
  ValidationResult,
} from './memory/memory-types';

// Memory errors
export {
  createMemoryError,
  rejectMemory,
  failMemory,
} from './memory/memory-errors';
export type {
  MemoryError,
  MemoryErrorCode,
  MemoryErrorKind,
} from './memory/memory-errors';

// Memory utils
export {
  DEFAULT_MEMORY_CONFIG,
  toIsoString,
  clampNumber,
  cosineSimilarity,
  hashString,
  createStableId,
  normalizeMemoryConfig,
  buildPastMemoryBlock,
  formatSummaryContext,
  formatStmContext,
  formatLtmContext,
  formatSharedMemoryContext,
  formatFactsContext,
  formatMemoryContextPayload,
  formatMemoryContext,
} from './memory/memory-utils';

// Memory service internals (for advanced users / extension)
export type { MemoryStore, MemoryOperationOptions, MemoryServiceOptions } from './memory/memory-service';
export type { RemoteMemoryServiceOptions } from './memory/memory-remote';

// Memory sub-systems
export { MemoryRepository } from './memory/memory-repository';

export { LocalEmbeddingProvider } from './memory/memory-embedding';
export type { EmbeddingOptions, EmbeddingProvider } from './memory/memory-embedding';

export { InMemoryVectorStore } from './memory/memory-vector-store';
export type { VectorRecord, VectorQuery, VectorSearchResult, VectorStore } from './memory/memory-vector-store';

export { LocalFactExtractor, NoopCanonValidator } from './memory/memory-facts';
export type { FactExtractionOptions, FactExtractor, CanonValidator } from './memory/memory-facts';

export { LocalSummaryProvider } from './memory/memory-summary';
export type { SummaryOptions, SummaryProvider } from './memory/memory-summary';
