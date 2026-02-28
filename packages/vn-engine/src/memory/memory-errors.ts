/**
 * Memory system error definitions
 * Provides observable and classifiable error codes.
 */

export type MemoryErrorCode =
  | 'MEMORY_DISABLED'
  | 'INVALID_INPUT'
  | 'STORE_NOT_FOUND'
  | 'DB_READ_FAILED'
  | 'DB_WRITE_FAILED'
  | 'VECTOR_STORE_FAILED'
  | 'EMBEDDING_FAILED'
  | 'SUMMARY_FAILED'
  | 'FACT_EXTRACTION_FAILED'
  | 'CANON_VALIDATION_FAILED'
  | 'TIMEOUT'
  | 'CANCELLED';

export type MemoryErrorKind = 'rejected' | 'failed';

export type MemoryError = {
  code: MemoryErrorCode;
  message: string;
  kind: MemoryErrorKind;
  meta?: Record<string, unknown>;
};

export const createMemoryError = (
  code: MemoryErrorCode,
  message: string,
  kind: MemoryErrorKind,
  meta?: Record<string, unknown>
): MemoryError => ({
  code,
  message,
  kind,
  meta
});

export const rejectMemory = (
  code: MemoryErrorCode,
  message: string,
  meta?: Record<string, unknown>
): MemoryError => createMemoryError(code, message, 'rejected', meta);

export const failMemory = (
  code: MemoryErrorCode,
  message: string,
  meta?: Record<string, unknown>
): MemoryError => createMemoryError(code, message, 'failed', meta);
