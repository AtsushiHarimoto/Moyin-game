/**
 * Session, save-slot, and snapshot persistence types.
 *
 * These mirror the Dexie (IndexedDB) row shapes used by the VN engine
 * but carry zero framework dependencies so they can be consumed by any
 * runtime or tooling package.
 */

import type { Phase, Frame, StageView, ChoiceView, RelationshipDelta } from './vn.js';

// ---------------------------------------------------------------------------
// Status enums
// ---------------------------------------------------------------------------

export type SessionStatus = 'active' | 'archived' | 'deleted';
export type TurnStatus = 'streaming' | 'committed' | 'aborted' | 'failed';
export type CommitType = 'TURN_COMMIT' | 'SYSTEM_COMMIT';
export type StoryPackStatus = 'active' | 'disabled' | 'incompatible';

// ---------------------------------------------------------------------------
// LLM conversation lane
// ---------------------------------------------------------------------------

/**
 * Reference to a single LLM conversation lane.
 *
 * A session may hold multiple lanes (multi-conversation support),
 * each tracking a separate provider/model conversation thread.
 */
export type ConversationRef = {
  /** LLM provider identifier (e.g. `grok`, `gemini`). */
  provider: string;
  /** Model name. */
  model?: string | null;
  /** Provider-specific conversation ID for this lane. */
  conversationId: string;
  /** Revision at the time of the last handover. */
  lastHandoverRevision: number;
  /** Hash of the shared summary (used to determine if re-send is needed). */
  lastSharedSummaryHash?: string | null;
};

// ---------------------------------------------------------------------------
// Provider metadata
// ---------------------------------------------------------------------------

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
  timings?: { start?: string; end?: string; durationMs?: number };
  network?: { requestId?: string | null; [key: string]: unknown };
  [key: string]: unknown;
};

// ---------------------------------------------------------------------------
// Session row
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Turn row
// ---------------------------------------------------------------------------

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
};

// ---------------------------------------------------------------------------
// Commit row & deltas
// ---------------------------------------------------------------------------

export type CommitDelta = {
  completedEventsAdd?: string[];
  flagsSet?: string[];
  relationshipDelta?: RelationshipDelta[];
  stageDelta?: { sceneId?: string; chapterId?: string };
  choiceDelta?: {
    choiceId?: string;
    optionId?: string;
    action?: 'show' | 'clear' | 'select';
  };
  endingDelta?: { endingId?: string; terminalSceneId?: string };
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

// ---------------------------------------------------------------------------
// Ending unlock
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Snapshot
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Save slot
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Story pack row
// ---------------------------------------------------------------------------

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
