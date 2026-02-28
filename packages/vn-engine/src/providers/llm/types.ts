export type LlmTurnRequest = {
  turnIndex?: number;
  sceneId: string;
  chapterId?: string;
  inputType: 'talk' | 'action';
  text?: string;
  chipId?: string;
  choiceId?: string;
  optionId?: string;
  targetCharId?: string | null;

  playerId?: string | null;
  activeCast: string[];
  castMeta?: Record<string, { displayName: string }>;
  assetsWhitelist?: Record<string, unknown> | string[];
  relationship?: Record<string, {value: number}>;
  sessionId?: string | null;
  llmConversationId?: string | null;
  laneKey?: string | null;
  handover?: {
    previousLaneKey?: string | null;
    sharedSummary?: string | null;
  } | null;
  systemPrompt?: string;
  userPrompt?: string;
  historySummary?: string;
  memoryContext?: string;
  historyContext?: {conversation_id?: string; response_id?: string} | null;
  locale?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  signal?: AbortSignal;
};

export type LlmRawFrame = {
  speaker?: string;
  text: string;
};

export type LegacyPortraitHint = {
  id: string;
  poseUrl?: string;
  position?: 'left' | 'center' | 'right';
};

export type LlmProposal = {
  relationshipDelta?: Array<{
    fromWho: string;
    toWho: string;
    trackKey: string;
    delta: number;
    note?: string;
    reason?: string;
  }>;
  flagSet?: string[];
  eventSignal?: string | {eventId?: string; signal?: string};
  eventSignals?: Array<{eventId?: string; signal?: string}>;
  intentSuggestion?: {mainAction?: string; attitude?: string};
  choiceTrigger?: {reason?: string} | string;
  customStatDelta?: Array<{statKey?: string; delta?: number}>;
};

export type StageHints = {
  bgKey?: string | null;
  portraits?: string[] | LegacyPortraitHint[] | null;
  bgmKey?: string | null;
  sfxKey?: string | null;
};

export type LlmRawResponse = {
  meta?: LegacyLlmMeta;
  frames?: LlmRawFrame[];
  proposals?: LlmProposal[];
  stageHints?: StageHints | null;
  rawText?: string;
  rawJson?: unknown;
  provider?: string;
  model?: string | null;
};

export type LegacyLlmMeta = {
  conversation_id?: string;
  response_id?: string;
  candidate_id?: string;
  protocolVersion?: string;
  requestId?: string;
  request_id?: string;
};

export type LlmResponse = LlmRawResponse & {
  meta?: LegacyLlmMeta;
  provider?: string;
  model?: string | null;
};

export type ProviderMeta = {
  llmConversationId?: string | null;
  llmResponseId?: string | null;
  llmCandidateId?: string | null;
  laneKey?: string | null;
  modelInfo?: {
    provider?: string;
    model?: string | null;
    meta?: Record<string, unknown>;
    [key: string]: unknown;
  };
  timings?: {start?: string; end?: string; durationMs?: number};
  network?: {requestId?: string | null; [key: string]: unknown};
  [key: string]: unknown;
};

export type LlmProviderResult =
  | LlmRawResponse
  | {
      raw: LlmRawResponse;
      providerMeta?: ProviderMeta;
    };
