/**
 * LLM (Large Language Model) adapter types.
 *
 * Covers: provider identifiers, message format, request options,
 * response structures, streaming callbacks, and model metadata.
 */

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/** Supported LLM service providers. */
export type LLMProvider = 'google' | 'xai' | 'chatgpt' | 'ollama';

// ---------------------------------------------------------------------------
// Message
// ---------------------------------------------------------------------------

/** Role of a message participant. */
export type MessageRole = 'system' | 'user' | 'assistant';

/** A single message in an LLM conversation. */
export interface LLMMessage {
  role: MessageRole;
  content: string;
}

// ---------------------------------------------------------------------------
// Request options
// ---------------------------------------------------------------------------

/**
 * Unified request options for all LLM adapters.
 *
 * @property messages    - Ordered conversation messages.
 * @property temperature - Sampling temperature (0..1).
 * @property maxTokens   - Maximum tokens to generate.
 * @property stream      - Enable server-sent-event streaming.
 * @property locale      - Language hint for the prompt.
 * @property signal      - AbortSignal for cancellation.
 * @property timeoutMs   - Optional request timeout in milliseconds.
 */
export interface LLMRequestOptions {
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  locale?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
}

// ---------------------------------------------------------------------------
// Response
// ---------------------------------------------------------------------------

/** Token usage statistics. */
export interface LLMTokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/** Unified response from any LLM adapter. */
export interface LLMResponse {
  content: string;
  usage?: LLMTokenUsage;
  finishReason?: 'stop' | 'length' | 'error';
}

// ---------------------------------------------------------------------------
// Streaming
// ---------------------------------------------------------------------------

/**
 * Callback invoked for each streaming chunk.
 *
 * @param chunk - Incremental text fragment.
 * @param done  - `true` when the stream has ended.
 */
export type LLMStreamCallback = (chunk: string, done: boolean) => void;

// ---------------------------------------------------------------------------
// Model metadata
// ---------------------------------------------------------------------------

/**
 * Describes a single LLM model configuration.
 *
 * Used by the model-selection UI and adapter factory.
 */
export interface LLMModel {
  id: string;
  name: string;
  provider: LLMProvider;
  description?: string;
  maxTokens?: number;
  contextWindow?: number;
}

/** Per-model usage counters. */
export type ModelUsage = Record<string, number>;

// ---------------------------------------------------------------------------
// Game turn response (LLM output schema)
// ---------------------------------------------------------------------------

/** Metadata envelope returned by the LLM for a game turn. */
export interface GameMeta {
  conversation_id: string;
  response_id: string;
  candidate_id: string;
  protocolVersion?: string;
}

/** A single dialogue frame in the LLM game-turn response. */
export interface GameFrame {
  id: string;
  speaker: string;
  text: string;
  canNext?: boolean;
}

/** State-mutation proposals from a game turn. */
export interface GameProposal {
  relationshipDelta?: Array<{
    fromWho: string;
    toWho: string;
    trackKey: string;
    delta: number;
    note?: string;
    reason?: string;
  }> | null;
  flagSet?: string[] | null;
  eventSignal?: string | { eventId?: string; signal?: string } | null;
  eventSignals?: Array<{ eventId?: string; signal?: string }> | null;
  intentSuggestion?: { mainAction?: string; attitude?: string } | null;
  choiceTrigger?: { reason?: string } | string | null;
  customStatDelta?: Array<{ statKey?: string; delta?: number }> | null;
}

/** Stage-direction hints from a game turn. */
export interface GameStageHints {
  bgKey?: string | null;
  bgmKey?: string | null;
  sfxKey?: string | null;
  portraits?: Array<string | { id: string; poseUrl?: string; position?: 'left' | 'center' | 'right' }> | null;
}

/**
 * Complete LLM response for a single game turn.
 *
 * Mirrors the JSON-schema defined in `game_schema.json`.
 */
export interface GameTurnResponse {
  meta: GameMeta;
  frames: GameFrame[];
  proposals: GameProposal[];
  stageHints?: GameStageHints | null;
  provider: string;
  model?: string | null;
}
