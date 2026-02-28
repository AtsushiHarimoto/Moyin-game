/**
 * VN Runtime Result
 * Purpose: Unified result format for all VN Runtime operations.
 * Pattern: Result pattern (similar to Rust's Result<T, E>).
 */

export enum VnErrorCode {
    PHASE_MISMATCH = 'PHASE_MISMATCH',
    RUNTIME_BUSY = 'RUNTIME_BUSY',
    STORY_ENDED = 'STORY_ENDED',
    INVALID_INPUT = 'INVALID_INPUT',
}

export type RuntimeResult<T = void> = {
  status: 'ok' | 'rejected' | 'failed';
  data?: T;
  message?: string;
  code?: string;
  meta?: Record<string, unknown>;
};

export const ok = <T>(data?: T): RuntimeResult<T> => ({
  status: 'ok',
  data
});

export const rejected = <T = void>(message: string, code?: string, meta?: Record<string, unknown>): RuntimeResult<T> => ({
  status: 'rejected',
  message,
  code,
  meta
});

export const failed = <T = void>(message: string, code?: string, meta?: Record<string, unknown>): RuntimeResult<T> => ({
  status: 'failed',
  message,
  code,
  meta
});
