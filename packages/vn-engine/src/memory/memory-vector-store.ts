/**
 * Memory Vector Store (Framework-Agnostic)
 * Purpose: Encapsulate vector write and retrieval capabilities.
 */
import { err, ok, type Result } from '../utils/result';
import { failMemory } from './memory-errors';
import type { MemoryError } from './memory-errors';

export type VectorRecord = {
  id: string;
  ownerId: string;
  vector: number[];
  createdAt: string;
  importance: number;
};

export type VectorQuery = {
  ownerId: string;
  vector: number[];
  topK: number;
  minSimilarity: number;
};

export type VectorSearchResult = {
  id: string;
  score: number;
};

export interface VectorStore {
  upsert(record: VectorRecord): Promise<Result<void, MemoryError>>;
  delete(ownerId: string, id: string): Promise<Result<void, MemoryError>>;
  query(params: VectorQuery): Promise<Result<VectorSearchResult[], MemoryError>>;
  count(ownerId: string): Promise<Result<number, MemoryError>>;
}

export class InMemoryVectorStore implements VectorStore {
  private records = new Map<string, VectorRecord[]>();

  async upsert(record: VectorRecord): Promise<Result<void, MemoryError>> {
    const list = this.records.get(record.ownerId) ?? [];
    const existingIndex = list.findIndex((item) => item.id === record.id);
    if (existingIndex >= 0) {
      list[existingIndex] = record;
    } else {
      list.push(record);
    }
    this.records.set(record.ownerId, list);
    return ok(undefined);
  }

  async delete(ownerId: string, id: string): Promise<Result<void, MemoryError>> {
    const list = this.records.get(ownerId) ?? [];
    this.records.set(
      ownerId,
      list.filter((item) => item.id !== id)
    );
    return ok(undefined);
  }

  async query(params: VectorQuery): Promise<Result<VectorSearchResult[], MemoryError>> {
    try {
      const list = this.records.get(params.ownerId) ?? [];
      const scored = list
        .map((item) => ({
          id: item.id,
          score: cosineSimilarity(params.vector, item.vector)
        }))
        .filter((item) => item.score >= params.minSimilarity)
        .sort((a, b) => b.score - a.score)
        .slice(0, params.topK);
      return ok(scored);
    } catch (error) {
      return err(
        failMemory('VECTOR_STORE_FAILED', 'Vector query failed', {
          message: error instanceof Error ? error.message : String(error)
        })
      );
    }
  }

  async count(ownerId: string): Promise<Result<number, MemoryError>> {
    return ok((this.records.get(ownerId) ?? []).length);
  }
}

const cosineSimilarity = (a: number[], b: number[]): number => {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  if (!normA || !normB) return 0;
  return dot / Math.sqrt(normA * normB);
};
