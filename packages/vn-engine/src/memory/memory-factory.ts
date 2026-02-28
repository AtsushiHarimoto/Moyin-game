/**
 * Memory Factory (Framework-Agnostic)
 * Purpose: Create memory service instance based on configuration.
 * Removed: env var imports. All config is now passed via parameters.
 */
import type { MemoryError } from './memory-errors';
import { MemoryService } from './memory-service';
import { RemoteMemoryService } from './memory-remote';
import type { MemoryServicePort } from './memory-port';

export type CreateMemoryServiceOptions = {
  onError?: (error: MemoryError) => void;
  /** Whether memory system is enabled */
  enabled?: boolean;
  /** Whether to use remote memory service */
  remote?: boolean;
  /** Base URL for remote memory service */
  baseUrl?: string;
  /** Timeout in ms for remote memory service */
  timeoutMs?: number;
  /** Vector dimension for local embedding */
  vectorDimension?: number;
};

export const createMemoryService = (
  options: CreateMemoryServiceOptions = {}
): MemoryServicePort | undefined => {
  if (options.enabled === false) return undefined;
  if (options.remote) {
    return new RemoteMemoryService({
      baseUrl: options.baseUrl || 'http://localhost:8100',
      timeoutMs: options.timeoutMs,
      onError: options.onError
    });
  }
  return new MemoryService({
    onError: options.onError,
    enabled: options.enabled,
    vectorDimension: options.vectorDimension
  });
};
