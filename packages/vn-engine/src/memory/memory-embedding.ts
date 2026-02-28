/**
 * Memory Embedding Provider (Framework-Agnostic)
 * Purpose: Unified vector generation output.
 */
import { err, ok, type Result } from '../utils/result';
import { failMemory } from './memory-errors';
import type { MemoryError } from './memory-errors';
import { clampNumber, hashString } from './memory-utils';

export type EmbeddingOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
};

export interface EmbeddingProvider {
  embed(texts: string[], options?: EmbeddingOptions): Promise<Result<number[][], MemoryError>>;
}

export class LocalEmbeddingProvider implements EmbeddingProvider {
  constructor(private dimension: number) {}

  async embed(texts: string[], options?: EmbeddingOptions): Promise<Result<number[][], MemoryError>> {
    try {
      if (options?.signal?.aborted) {
        return err(failMemory('CANCELLED', 'Embedding cancelled'));
      }
      if (options?.timeoutMs && options.timeoutMs <= 0) {
        return err(failMemory('TIMEOUT', 'Embedding timeout'));
      }
      const vectors = texts.map((text) => buildDeterministicVector(text, this.dimension));
      return ok(vectors);
    } catch (error) {
      return err(
        failMemory('EMBEDDING_FAILED', 'Embedding failed', {
          message: error instanceof Error ? error.message : String(error)
        })
      );
    }
  }
}

const buildDeterministicVector = (text: string, dimension: number): number[] => {
  const seed = hashString(text);
  const seedValue = parseInt(seed, 16) || 0;
  const vector: number[] = [];
  let accumulator = seedValue || 1;
  for (let i = 0; i < dimension; i += 1) {
    accumulator = (accumulator * 9301 + 49297) % 233280;
    const normalized = accumulator / 233280;
    vector.push(clampNumber(normalized * 2 - 1, -1, 1));
  }
  return normalizeVector(vector);
};

const normalizeVector = (vector: number[]): number[] => {
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (!norm) return vector;
  return vector.map((value) => value / norm);
};
