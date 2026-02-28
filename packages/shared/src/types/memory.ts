/**
 * G4 Memory System types.
 *
 * Covers: emotion model, STM/MTM/LTM layers, fact storage,
 * canon validation, memory context, and audit structures.
 */

// ---------------------------------------------------------------------------
// Status & scope enums
// ---------------------------------------------------------------------------

export type MemoryOwnerScope = 'private' | 'shared';
export type MemoryCanonStatus = 'valid' | 'violation' | 'pending_check';
export type MemoryConflictStatus = 'pending_review' | 'resolved';

// ---------------------------------------------------------------------------
// Emotion model
// ---------------------------------------------------------------------------

export type EmotionCategory = 'positive' | 'negative' | 'neutral';

export type EmotionType =
  | 'joy'
  | 'love'
  | 'excitement'
  | 'relief'
  | 'sadness'
  | 'anger'
  | 'fear'
  | 'disgust'
  | 'anxiety'
  | 'neutral'
  | 'surprise'
  | 'curiosity';

/** Emotion with intensity in the range `[0.0, 1.0]`. */
export type EmotionState = {
  type: EmotionType;
  /** Intensity value between 0.0 and 1.0. */
  intensity: number;
};

// ---------------------------------------------------------------------------
// Dialogue turn (memory layer)
// ---------------------------------------------------------------------------

export type DialogueTurn = {
  role: 'user' | 'assistant' | 'witness';
  content: string;
  emotion?: EmotionState;
};

// ---------------------------------------------------------------------------
// Short-Term Memory (STM)
// ---------------------------------------------------------------------------

export type ShortTermMemory = {
  id: string;
  ownerId: string;
  turnId: string;
  role: DialogueTurn['role'];
  content: string;
  emotion?: EmotionState;
  turnIndex: number;
  createdAt: string;
};

// ---------------------------------------------------------------------------
// Medium-Term Memory (MTM) -- episode summaries
// ---------------------------------------------------------------------------

export type EpisodeSummary = {
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

// ---------------------------------------------------------------------------
// Long-Term Memory (LTM) -- semantic memories
// ---------------------------------------------------------------------------

export type SemanticMemory = {
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

// ---------------------------------------------------------------------------
// Facts
// ---------------------------------------------------------------------------

export type MemoryFactHistory = {
  value: string;
  sourceTurnId: string;
  confidence: number;
  updatedAt: string;
};

export type MemoryFact = {
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

// ---------------------------------------------------------------------------
// Memory configuration
// ---------------------------------------------------------------------------

export type MemoryConfig = {
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

// ---------------------------------------------------------------------------
// Memory store metadata
// ---------------------------------------------------------------------------

export type MemoryStoreMeta = {
  ownerId: string;
  currentTurnIndex: number;
  lastSummaryTurnIndex: number;
  consecutiveSummaryFailures: number;
  updatedAt: string;
};

// ---------------------------------------------------------------------------
// Archive payload (for promoting STM to LTM)
// ---------------------------------------------------------------------------

export type ArchivePayload = {
  content: string;
  category: 'event' | 'preference' | 'fact';
  sourceTurnId: string;
  emotion?: EmotionState;
  importance?: number;
  scope?: MemoryOwnerScope;
};

// ---------------------------------------------------------------------------
// Memory context block (assembled for LLM prompt)
// ---------------------------------------------------------------------------

export type MemoryContextBlock = {
  summary?: EpisodeSummary | null;
  memories: SemanticMemory[];
};

// ---------------------------------------------------------------------------
// Canon validation
// ---------------------------------------------------------------------------

export type CanonConstraint = {
  id: string;
  factKey: string;
  type: 'immutable' | 'range' | 'enum' | 'pattern';
  value: string | number | string[];
  description?: string;
};

export type ValidationConflict = {
  constraintId: string;
  factKey: string;
  expected: string;
  actual: string;
};

export type MemoryValidationResult = {
  valid: boolean;
  status: MemoryCanonStatus;
  conflicts?: ValidationConflict[];
};

// ---------------------------------------------------------------------------
// Composed memory context (formatted strings for prompt injection)
// ---------------------------------------------------------------------------

export type MemoryContext = {
  stm: string;
  mtm: string;
  ltm: string;
  facts: string;
};

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

export type ArchivedTurn = {
  turnId: string;
  archivedAt: string;
  summary: string;
  episodeId: string;
};

export type MemoryAuditInfo = {
  memory: SemanticMemory | MemoryFact;
  sourceTurn: ShortTermMemory | ArchivedTurn | null;
  usageHistory: Array<{
    promptId: string;
    timestamp: string;
  }>;
};

// ---------------------------------------------------------------------------
// Database row types (Dexie persistence layer)
// ---------------------------------------------------------------------------

export type MemoryStoreRow = {
  ownerId: string;
  currentTurnIndex: number;
  lastSummaryTurnIndex: number;
  consecutiveSummaryFailures: number;
  updatedAt: string;
};

export type MemoryConfigRow = {
  ownerId: string;
  config: MemoryConfig;
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
