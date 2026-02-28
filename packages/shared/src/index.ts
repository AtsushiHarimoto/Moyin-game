/**
 * @moyin/shared -- framework-agnostic types and utilities.
 *
 * Re-exports every public symbol from the package so consumers
 * can import from a single entry point:
 *
 * ```ts
 * import { Frame, Phase, LLMProvider } from '@moyin/shared';
 * ```
 */

// -- Types: common ----------------------------------------------------------
export type {
  EntityId,
  ISOTimestamp,
  Locale,
  ValidationResult,
  ValidationItem,
  ValidationReport,
  IconThemeVariant,
  IconThemeVariants,
  IconEntry,
  IconRegistry,
  IconValidationResult,
  StoryPreviewSummary,
} from './types/common.js';

// -- Types: visual novel ----------------------------------------------------
export type {
  StoryPackJson,
  AssetItemJson,
  CharacterJson,
  SceneJson,
  AssetJson,
  Phase,
  PortraitView,
  StageView,
  Frame,
  ChoiceOption,
  ChoiceView,
  TurnContext,
  TurnInput,
  RelationshipDelta,
  TurnResult,
  TurnInputPayload,
  TurnOutputPayload,
  TurnProvider,
  VnMode,
  NodeType,
  EdgeType,
  StoryPackNodeData,
  CharacterNodeData,
  SceneNodeData,
  ExtendedSceneNodeData,
  AssetGroupNodeData,
  AssetItem,
  FlowNodeData,
  StoryFlowEdge,
  CharacterAssetDisplay,
  BackgroundAssetDisplay,
  TransitionEffect,
  StageLayoutSlot,
  StageLayoutLayer,
  StageLayoutSpec,
  TransitionSpec,
  FxEffectSpec,
  FxPresetSpec,
  StageSkinSpec,
} from './types/vn.js';

export {
  ENTRY_SENTINEL,
  NODE_TYPES,
  EDGE_TYPES,
  EDITABLE_NODE_TYPES,
  CANVAS_CONFIG,
  TRANSITION_EFFECTS,
  isStoryPackData,
  isCharacterData,
  isSceneData,
  isAssetGroupData,
  isNodeType,
  isEditableNode,
} from './types/vn.js';

// -- UI constants (flow-graph editor) ---------------------------------------
export {
  FLOW_LAYOUT,
  NODE_COLORS,
  NODE_MATERIAL_ICONS,
} from './types/ui-constants.js';

// -- Types: session ---------------------------------------------------------
export type {
  SessionStatus,
  TurnStatus,
  CommitType,
  StoryPackStatus,
  ConversationRef,
  ModelInfo,
  ProviderMeta,
  SessionRow,
  TurnRow,
  CommitDelta,
  CommitAudit,
  CommitRow,
  EndingUnlockRow,
  SnapshotRow,
  SaveSlotPreview,
  SaveSlotRow,
  StoryPackRow,
} from './types/session.js';

// -- Types: memory ----------------------------------------------------------
export type {
  MemoryOwnerScope,
  MemoryCanonStatus,
  MemoryConflictStatus,
  EmotionCategory,
  EmotionType,
  EmotionState,
  DialogueTurn,
  ShortTermMemory,
  EpisodeSummary,
  SemanticMemory,
  MemoryFactHistory,
  MemoryFact,
  MemoryConfig,
  MemoryStoreMeta,
  ArchivePayload,
  MemoryContextBlock,
  CanonConstraint,
  ValidationConflict,
  MemoryValidationResult,
  MemoryContext,
  ArchivedTurn,
  MemoryAuditInfo,
  MemoryStoreRow,
  MemoryConfigRow,
  MemoryStmRow,
  MemoryMtmRow,
  MemoryLtmRow,
  MemoryFactRow,
} from './types/memory.js';

// -- Types: LLM -------------------------------------------------------------
export type {
  LLMProvider,
  MessageRole,
  LLMMessage,
  LLMRequestOptions,
  LLMTokenUsage,
  LLMResponse,
  LLMStreamCallback,
  LLMModel,
  ModelUsage,
  GameMeta,
  GameFrame,
  GameProposal,
  GameStageHints,
  GameTurnResponse,
} from './types/llm.js';

// -- Types: API -------------------------------------------------------------
export type {
  ApiResponse,
  ApiErrorResponse,
  ApiResult,
  PaginationParams,
  PaginatedResponse,
  ImportStoryPackRequest,
  ImportStoryPackResponse,
  CreateSessionRequest,
  CreateSessionResponse,
  SubmitTurnRequest,
  SubmitTurnResponse,
  SaveSlotRequest,
  LoadSlotRequest,
} from './types/api.js';

// -- Types: UI --------------------------------------------------------------
export type {
  BackgroundProps,
  UiPreferences,
  VnUiPrefs,
  ActionItem,
  TalkTemplate,
  CharacterSelectItem,
  BacklogEntry,
} from './types/ui.js';

// -- Types: events ----------------------------------------------------------
export type {
  VnRuntimeEvent,
  InputTabType,
  EventCompletionKind,
  EndingType,
  AssetType,
  EventMap,
} from './types/events.js';

// -- Utils: format ----------------------------------------------------------
export {
  flattenArray,
  collectStrings,
  isNumberArray,
  buildEntries,
  getPreviewSummary,
} from './utils/format.js';

export type { EntityEntry } from './utils/format.js';

// -- Utils: validation ------------------------------------------------------
export {
  ID_PATTERN,
  isValidEntityId,
  validateSvgContent,
  SUPPORTED_SCHEMA_VERSIONS,
  EXPECTED_PROTOCOL_PIN,
  ALLOWED_EVENT_KINDS,
  ALLOWED_ENDING_TYPES,
  ALLOWED_ASSET_TYPES,
} from './utils/validation.js';

export type { SvgValidationResult } from './utils/validation.js';
