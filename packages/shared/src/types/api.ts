/**
 * API request and response envelope types.
 *
 * Framework-agnostic shapes for client-server communication.
 */

// ---------------------------------------------------------------------------
// Generic envelope
// ---------------------------------------------------------------------------

/** Standard success response wrapper. */
export interface ApiResponse<T = unknown> {
  ok: true;
  data: T;
}

/** Standard error response wrapper. */
export interface ApiErrorResponse {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/** Union of success and error envelopes. */
export type ApiResult<T = unknown> = ApiResponse<T> | ApiErrorResponse;

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  cursor?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  nextCursor?: string;
}

// ---------------------------------------------------------------------------
// Story pack API
// ---------------------------------------------------------------------------

export interface ImportStoryPackRequest {
  storyKey: string;
  packVersion: string;
  payload: unknown;
}

export interface ImportStoryPackResponse {
  packId: string;
  storyKey: string;
  packVersion: string;
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Session API
// ---------------------------------------------------------------------------

export interface CreateSessionRequest {
  storyKey: string;
  packVersion: string;
  playerId?: string;
}

export interface CreateSessionResponse {
  sessionId: string;
}

// ---------------------------------------------------------------------------
// Turn API
// ---------------------------------------------------------------------------

export interface SubmitTurnRequest {
  sessionId: string;
  inputType: 'talk' | 'action' | 'choice' | 'system';
  inputText?: string | null;
  chipId?: string | null;
  choiceId?: string | null;
  optionId?: string | null;
  targetCharId?: string | null;
}

export interface SubmitTurnResponse {
  turnId: string;
  commitId?: string;
  revision: number;
}

// ---------------------------------------------------------------------------
// Save / Load API
// ---------------------------------------------------------------------------

export interface SaveSlotRequest {
  sessionId: string;
  title?: string;
}

export interface LoadSlotRequest {
  slotId: string;
}
