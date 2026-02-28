import type { ChoiceView, Frame, StageView } from '../providers/types';
import type {
  EmotionState,
  MemoryCanonStatus,
  MemoryConflictStatus,
  MemoryFactHistory,
  MemoryOwnerScope
} from '../memory/memory-types';

export type Phase = 'idle' | 'playing' | 'await_input' | 'await_choice' | 'busy' | 'ended';
export type SessionStatus = 'active' | 'archived' | 'deleted';
export type TurnStatus = 'streaming' | 'committed' | 'aborted' | 'failed';
export type CommitType = 'TURN_COMMIT' | 'SYSTEM_COMMIT';

export type ConversationRef = {
  provider: string;
  model?: string | null;
  conversationId: string;
  lastHandoverRevision: number;
  lastSharedSummaryHash?: string | null;
};

export type SessionRow = {
  sessionId: string;
  storyKey: string;
  packVersion: string;
  protocolVersion: string;
  schemaVersion: number;
  status: SessionStatus;
  headCommitId?: string | null;
  headRevision: number;
  activeChapterId: string;
  activeSceneId: string;
  phase: Phase;
  endingId?: string | null;
  playerId?: string | null;
  targetCharId?: string | null;
  llmConversationId?: string | null;
  conversationLanes?: Record<string, ConversationRef>;
  createdAt: string;
  updatedAt: string;
  lastPlayedAt: string;
};

export type TurnRow = {
  turnId: string;
  sessionId: string;
  requestId?: string | null;
  revisionFrom: number;
  revisionTo: number | null;
  inputType: 'talk' | 'action' | 'choice' | 'system';
  inputText?: string | null;
  chipId?: string | null;
  choiceId?: string | null;
  optionId?: string | null;
  status: TurnStatus;
  targetCharId?: string | null;
  llmConversationId?: string | null;
  llmResponseId?: string | null;
  llmCandidateId?: string | null;
  laneKey?: string | null;
  llmRawText?: string | null;
  llmRawJson?: unknown | null;
  llmRequestJson?: unknown | null;
  providerMeta?: ProviderMeta | null;
  frames: Frame[];
  stageView?: StageView;
  choiceView?: ChoiceView | null;
  endingId?: string | null;
  commitId?: string | null;
  eventSignals?: string[];
  createdAt: string;
  finishedAt?: string | null;
  // Legacy nested output support
  output?: TurnOutputPayload;
};

export type CommitDelta = {
  completedEventsAdd?: string[];
  flagsSet?: string[];
  relationshipDelta?: Array<{
    fromWho: string;
    toWho: string;
    trackKey: string;
    delta: number;
    note?: string;
    reason?: string;
  }>;
  stageDelta?: {sceneId?: string; chapterId?: string};
  choiceDelta?: {choiceId?: string; optionId?: string; action?: 'show' | 'clear' | 'select'};
  endingDelta?: {endingId?: string; terminalSceneId?: string};
};

export type CommitAudit = {
  droppedEffects?: string[];
  rejectedSignals?: string[];
  acceptedEventSignals?: string[];
  rejectedEventSignals?: string[];
  capApplied?: boolean;
  decayApplied?: boolean;
  reasonCodes?: string[];
  notes?: string[];
  laneUsed?: string | null;
  laneSwitch?: { from?: string | null; to?: string } | null;
};

export type ModelInfo = {
  provider?: string;
  model?: string | null;
  meta?: Record<string, unknown>;
  [key: string]: unknown;
};

export type ProviderMeta = {
  llmConversationId?: string | null;
  llmResponseId?: string | null;
  llmCandidateId?: string | null;
  modelInfo?: ModelInfo;
  timings?: {start?: string; end?: string; durationMs?: number};
  network?: {requestId?: string | null; [key: string]: unknown};
  [key: string]: unknown;
};

export type CommitRow = {
  commitId: string;
  sessionId: string;
  parentCommitId?: string | null;
  revisionFrom: number;
  revisionTo: number;
  turnId: string;
  type: CommitType;
  delta: CommitDelta;
  audit?: CommitAudit;
  modelInfo?: ModelInfo;
  llmConversationId?: string | null;
  llmResponseId?: string | null;
  llmCandidateId?: string | null;
  llmRawText?: string | null;
  llmRawJson?: unknown | null;
  llmRequestJson?: unknown | null;
  providerMeta?: ProviderMeta | null;
  idempotencyKey: string;
  createdAt: string;
};

export type EndingUnlockRow = {
  unlockId: string;
  storyKey: string;
  packVersion: string;
  endingId: string;
  type?: string;
  terminalSceneId?: string;
  unlockedAt: string;
  bySessionId?: string;
  meta?: Record<string, unknown>;
};

export type SnapshotRow = {
  snapshotId: string;
  sessionId: string;
  revision: number;
  commitId: string;
  activeChapterId: string;
  activeSceneId: string;
  phase: Phase;
  endingId?: string | null;
  playerId?: string | null;
  relationship?: Record<string, number | Record<string, number>>;
  targetCharId?: string | null;
  providerMeta?: ProviderMeta | null;
  llmRawText?: string | null;
  llmRawJson?: unknown | null;
  flags: string[];
  eventsDone: string[];
  frames?: Frame[];
  createdAt: string;
};

export type TurnInputPayload = {
  inputType: 'talk' | 'action' | 'choice' | 'system';
  inputText?: string | null;
  chipId?: string | null;
  choiceId?: string | null;
  optionId?: string | null;
  targetCharId?: string | null;
};

export type TurnOutputPayload = {
  frames: Frame[];
  stageView?: StageView;
  choiceView?: ChoiceView | null;
  endingId?: string | null;
  eventSignals?: string[];
};

export type SaveSlotPreview = {
  sceneId?: string;
  speakerName?: string;
  textSnippet?: string;
  endingId?: string;
  coverAssetKey?: string;
  screenshotUrl?: string;
};

export type SaveSlotRow = {
  slotId: string;
  storyKey: string;
  packVersion: string;
  sessionId: string;
  snapshotId: string;
  baseCommitId?: string | null;
  baseRevision: number;
  title: string;
  preview?: SaveSlotPreview | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type StoryPackStatus = 'active' | 'disabled' | 'incompatible';

export type StoryPackRow = {
  packId: string;
  storyKey: string;
  packVersion: string;
  schemaVersion: number;
  protocolVersionPin?: string | null;
  title?: string | null;
  status: StoryPackStatus;
  importedAt: string;
  updatedAt: string;
  payload: unknown;
  rawPayload?: unknown | null;
  checksum?: string | null;
  warnings?: string[] | null;
  errors?: string[] | null;
};

// ---- G4 Memory System ----

export type MemoryStoreRow = {
  ownerId: string;
  currentTurnIndex: number;
  lastSummaryTurnIndex: number;
  consecutiveSummaryFailures: number;
  updatedAt: string;
};

export type MemoryConfigRow = {
  ownerId: string;
  config: {
    stmMaxTurns: number;
    summaryThreshold: number;
    ltmDefaultTopK: number;
    minSimilarity: number;
    autoExtractFacts: boolean;
    enableCanonValidation: boolean;
    ltmMaxEntries: number;
    summaryMaxRetries: number;
    summaryRetryDelayMs: number;
  };
  updatedAt: string;
};

export type MemoryStmRow = {
  id: string;
  ownerId: string;
  turnId: string;
  role: 'user' | 'assistant' | 'witness';
  content: string;
  emotion?: EmotionState;
  turnIndex: number;
  createdAt: string;
};

export type MemoryMtmRow = {
  id: string;
  ownerId: string;
  summary: string;
  mood?: string;
  goals?: string[];
  sourceTurnId: string;
  importanceScore: number;
  tags: string[];
  emotion?: EmotionState;
  createdAt: string;
};

export type MemoryLtmRow = {
  id: string;
  ownerId: string;
  content: string;
  embedding: number[];
  sourceTurnId: string;
  importance: number;
  canonStatus: MemoryCanonStatus;
  scope: MemoryOwnerScope;
  createdAt: string;
  lastAccessAt?: string | null;
  accessCount?: number;
};

export type MemoryFactRow = {
  id: string;
  ownerId: string;
  key: string;
  value: string;
  sourceTurnId: string;
  confidence: number;
  canonStatus: MemoryCanonStatus;
  conflictStatus: MemoryConflictStatus;
  factHistory: MemoryFactHistory[];
  createdAt: string;
  updatedAt: string;
};
