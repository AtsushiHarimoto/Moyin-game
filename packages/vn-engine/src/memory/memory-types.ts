/**
 * Memory system type definitions
 * Centralized data models and settings for the G4 Memory System.
 */

export type MemoryOwnerScope = 'private' | 'shared';
export type MemoryCanonStatus = 'valid' | 'violation' | 'pending_check';
export type MemoryConflictStatus = 'pending_review' | 'resolved';

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

export type EmotionState = {
  type: EmotionType;
  intensity: number; // 0.0 ~ 1.0
};

export type DialogueTurn = {
  role: 'user' | 'assistant' | 'witness';
  content: string;
  emotion?: EmotionState;
};

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

export type MemoryStoreMeta = {
  ownerId: string;
  currentTurnIndex: number;
  lastSummaryTurnIndex: number;
  consecutiveSummaryFailures: number;
  updatedAt: string;
};

export type ArchivePayload = {
  content: string;
  category: 'event' | 'preference' | 'fact';
  sourceTurnId: string;
  emotion?: EmotionState;
  importance?: number;
  scope?: MemoryOwnerScope;
};

export type MemoryContextBlock = {
  summary?: EpisodeSummary | null;
  memories: SemanticMemory[];
};

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

export type ValidationResult = {
  valid: boolean;
  status: MemoryCanonStatus;
  conflicts?: ValidationConflict[];
};

export type MemoryContext = {
  stm: string;
  mtm: string;
  ltm: string;
  facts: string;
};

export type MemoryAuditInfo = {
  memory: SemanticMemory | MemoryFact;
  sourceTurn: ShortTermMemory | ArchivedTurn | null;
  usageHistory: {
    promptId: string;
    timestamp: string;
  }[];
};

export type ArchivedTurn = {
  turnId: string;
  archivedAt: string;
  summary: string;
  episodeId: string;
};
