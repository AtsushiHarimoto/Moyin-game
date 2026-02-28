/**
 * Memory Service Port (Framework-Agnostic)
 * Purpose: Define the minimal memory service contract for VN Engine.
 */
import type { Result } from '../utils/result';
import type { MemoryError } from './memory-errors';
import type {
  DialogueTurn,
  EpisodeSummary,
  MemoryConfig,
  MemoryContext,
  MemoryFact,
  SemanticMemory,
  ShortTermMemory
} from './memory-types';
import type { MemoryStore, MemoryOperationOptions } from './memory-service';

export interface MemoryServicePort {
  initStore(characterId: string): Promise<Result<MemoryStore, MemoryError>>;

  loadStore(characterId: string): Promise<Result<MemoryStore | null, MemoryError>>;

  setConfig(characterId: string, configPatch: Partial<MemoryConfig>): Promise<Result<void, MemoryError>>;

  getConfig(characterId: string): Promise<Result<MemoryConfig, MemoryError>>;

  appendTurn(characterId: string, turn: DialogueTurn): Promise<Result<string, MemoryError>>;

  extractFacts(
    characterId: string,
    turnId: string,
    content: string
  ): Promise<Result<MemoryFact[], MemoryError>>;

  triggerSummary(characterId: string): Promise<Result<void, MemoryError>>;

  getCurrentSummary(characterId: string): Promise<Result<EpisodeSummary | null, MemoryError>>;

  buildMemoryContext(characterId: string, query: string): Promise<Result<MemoryContext, MemoryError>>;

  retrieveSharedMemories(
    characterIds: string[],
    query: string,
    topK?: number
  ): Promise<Result<SemanticMemory[], MemoryError>>;

  shareMemory(
    characterId: string,
    memoryId: string,
    targetScope?: 'shared'
  ): Promise<Result<void, MemoryError>>;

  getRecentTurns?(
    characterId: string,
    n?: number
  ): Promise<Result<ShortTermMemory[], MemoryError>>;

  retrieveMemories?(
    characterId: string,
    query: string,
    topK?: number,
    minSimilarity?: number,
    options?: MemoryOperationOptions
  ): Promise<Result<SemanticMemory[], MemoryError>>;
}
