/**
 * G4 Memory Service (Framework-Agnostic)
 * Purpose: Provide STM/MTM/LTM write, retrieve, and summary pipeline.
 * Removed: IS_G4_MEMORY_ENABLED / G4_MEMORY_VECTOR_DIM env vars.
 * Memory enabled check is now done via config parameter in constructor.
 */
import { err, isErr, ok, type Result } from '../utils/result';
import type { MemoryError } from './memory-errors';
import { failMemory, rejectMemory } from './memory-errors';
import type {
  ArchivePayload,
  CanonConstraint,
  DialogueTurn,
  EpisodeSummary,
  MemoryAuditInfo,
  MemoryConfig,
  MemoryContext,
  MemoryFact,
  MemoryStoreMeta,
  SemanticMemory,
  ShortTermMemory,
  ValidationResult
} from './memory-types';
import {
  DEFAULT_MEMORY_CONFIG,
  createStableId,
  formatFactsContext,
  formatLtmContext,
  formatStmContext,
  formatSummaryContext,
  normalizeMemoryConfig,
  toIsoString
} from './memory-utils';
import { MemoryRepository } from './memory-repository';
import { InMemoryVectorStore, type VectorStore } from './memory-vector-store';
import { LocalEmbeddingProvider, type EmbeddingProvider } from './memory-embedding';
import { LocalSummaryProvider, type SummaryProvider } from './memory-summary';
import { LocalFactExtractor, NoopCanonValidator, type CanonValidator, type FactExtractor } from './memory-facts';

export type MemoryOperationOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
};

export type MemoryStore = {
  ownerId: string;
  config: MemoryConfig;
  meta: MemoryStoreMeta;
};

export type MemoryServiceOptions = {
  repository?: MemoryRepository;
  vectorStore?: VectorStore;
  embeddingProvider?: EmbeddingProvider;
  summaryProvider?: SummaryProvider;
  factExtractor?: FactExtractor;
  canonValidator?: CanonValidator;
  onError?: (error: MemoryError) => void;
  /** Whether memory system is enabled (replaces IS_G4_MEMORY_ENABLED env var) */
  enabled?: boolean;
  /** Vector dimension (replaces G4_MEMORY_VECTOR_DIM env var) */
  vectorDimension?: number;
};

export class MemoryService {
  private repository: MemoryRepository;
  private vectorStore: VectorStore;
  private embeddingProvider: EmbeddingProvider;
  private summaryProvider: SummaryProvider;
  private factExtractor: FactExtractor;
  private canonValidator: CanonValidator;
  private onError?: (error: MemoryError) => void;
  private enabled: boolean;

  constructor(options: MemoryServiceOptions = {}) {
    this.enabled = options.enabled !== false;
    const vectorDim = resolveVectorDimension(options.vectorDimension);
    this.repository = options.repository ?? new MemoryRepository();
    this.vectorStore = options.vectorStore ?? new InMemoryVectorStore();
    this.embeddingProvider = options.embeddingProvider ?? new LocalEmbeddingProvider(vectorDim);
    this.summaryProvider = options.summaryProvider ?? new LocalSummaryProvider();
    this.factExtractor = options.factExtractor ?? new LocalFactExtractor();
    this.canonValidator = options.canonValidator ?? new NoopCanonValidator();
    this.onError = options.onError;
  }

  async initStore(characterId: string): Promise<Result<MemoryStore, MemoryError>> {
    if (!this.enabled) return err(rejectMemory('MEMORY_DISABLED', 'Memory system disabled'));
    const ownerId = characterId;
    const meta: MemoryStoreMeta = {
      ownerId,
      currentTurnIndex: 0,
      lastSummaryTurnIndex: 0,
      consecutiveSummaryFailures: 0,
      updatedAt: toIsoString()
    };
    const configLookup = await this.repository.getConfig(ownerId);
    if (isErr(configLookup)) return err(configLookup.error);
    const config = normalizeMemoryConfig(configLookup.value?.config ?? DEFAULT_MEMORY_CONFIG);

    const metaResult = await this.repository.upsertStoreMeta({
      ownerId,
      currentTurnIndex: meta.currentTurnIndex,
      lastSummaryTurnIndex: meta.lastSummaryTurnIndex,
      consecutiveSummaryFailures: meta.consecutiveSummaryFailures,
      updatedAt: meta.updatedAt
    });
    if (isErr(metaResult)) return err(metaResult.error);

    if (!configLookup.value) {
      const configResult = await this.repository.upsertConfig({
        ownerId,
        config,
        updatedAt: toIsoString()
      });
      if (isErr(configResult)) return err(configResult.error);
    }

    return ok({ ownerId, config, meta });
  }

  async loadStore(characterId: string): Promise<Result<MemoryStore | null, MemoryError>> {
    if (!this.enabled) return err(rejectMemory('MEMORY_DISABLED', 'Memory system disabled'));
    const ownerId = characterId;
    const metaResult = await this.repository.getStoreMeta(ownerId);
    if (isErr(metaResult)) return err(metaResult.error);
    if (!metaResult.value) return ok(null);

    const configResult = await this.repository.getConfig(ownerId);
    if (isErr(configResult)) return err(configResult.error);

    const config = normalizeMemoryConfig(configResult.value?.config ?? DEFAULT_MEMORY_CONFIG);
    const metaRow = metaResult.value;
    const meta: MemoryStoreMeta = {
      ownerId,
      currentTurnIndex: metaRow.currentTurnIndex,
      lastSummaryTurnIndex: metaRow.lastSummaryTurnIndex,
      consecutiveSummaryFailures: metaRow.consecutiveSummaryFailures,
      updatedAt: metaRow.updatedAt
    };

    await this.rebuildVectorIndex(ownerId);

    return ok({ ownerId, config, meta });
  }

  async loadStores(characterIds: string[]): Promise<Result<Map<string, MemoryStore>, MemoryError>> {
    const result = new Map<string, MemoryStore>();
    for (const id of characterIds) {
      const storeResult = await this.loadStore(id);
      if (isErr(storeResult)) return err(storeResult.error);
      if (storeResult.value) result.set(id, storeResult.value);
    }
    return ok(result);
  }

  async setConfig(characterId: string, configPatch: Partial<MemoryConfig>): Promise<Result<void, MemoryError>> {
    const ownerId = characterId;
    const existing = await this.repository.getConfig(ownerId);
    if (isErr(existing)) return err(existing.error);
    const merged = normalizeMemoryConfig({
      ...(existing.value?.config ?? DEFAULT_MEMORY_CONFIG),
      ...configPatch
    });
    const result = await this.repository.upsertConfig({
      ownerId,
      config: merged,
      updatedAt: toIsoString()
    });
    if (isErr(result)) return err(result.error);
    return ok(undefined);
  }

  async getConfig(characterId: string): Promise<Result<MemoryConfig, MemoryError>> {
    const ownerId = characterId;
    const configResult = await this.repository.getConfig(ownerId);
    if (isErr(configResult)) return err(configResult.error);
    const config = normalizeMemoryConfig(configResult.value?.config ?? DEFAULT_MEMORY_CONFIG);
    return ok(config);
  }

  async appendTurn(
    characterId: string,
    turn: DialogueTurn,
    options?: MemoryOperationOptions
  ): Promise<Result<string, MemoryError>> {
    if (!this.enabled) return err(rejectMemory('MEMORY_DISABLED', 'Memory system disabled'));
    if (options?.signal?.aborted) return err(failMemory('CANCELLED', 'Append turn cancelled'));

    const ownerId = characterId;
    const storeResult = await this.ensureStore(ownerId);
    if (isErr(storeResult)) return err(storeResult.error);
    const store = storeResult.value;

    const turnIndex = store.meta.currentTurnIndex + 1;
    const turnId = createStableId('turn', [ownerId, turnIndex, turn.role, turn.content]);
    const stmId = createStableId('stm', [ownerId, turnId]);

    const addResult = await this.repository.addStm({
      id: stmId,
      ownerId,
      turnId,
      role: turn.role,
      content: turn.content,
      emotion: turn.emotion,
      turnIndex,
      createdAt: toIsoString()
    });
    if (isErr(addResult)) return err(addResult.error);

    store.meta.currentTurnIndex = turnIndex;
    store.meta.updatedAt = toIsoString();
    const metaResult = await this.repository.upsertStoreMeta({
      ownerId,
      currentTurnIndex: store.meta.currentTurnIndex,
      lastSummaryTurnIndex: store.meta.lastSummaryTurnIndex,
      consecutiveSummaryFailures: store.meta.consecutiveSummaryFailures,
      updatedAt: store.meta.updatedAt
    });
    if (isErr(metaResult)) return err(metaResult.error);

    await this.enforceStmLimit(ownerId, store.config.stmMaxTurns);

    const shouldTrigger = (turnIndex - store.meta.lastSummaryTurnIndex) >= store.config.summaryThreshold;
    if (shouldTrigger) {
      this.safeTriggerSummary(ownerId).catch(() => undefined);
    }

    return ok(turnId);
  }

  async batchAppendTurns(
    turns: { characterId: string; turn: DialogueTurn }[],
    options?: MemoryOperationOptions
  ): Promise<Result<string[], MemoryError>> {
    const ids: string[] = [];
    for (const item of turns) {
      const result = await this.appendTurn(item.characterId, item.turn, options);
      if (isErr(result)) return err(result.error);
      ids.push(result.value);
    }
    return ok(ids);
  }

  async getRecentTurns(characterId: string, n = 5): Promise<Result<ShortTermMemory[], MemoryError>> {
    const ownerId = characterId;
    const listResult = await this.repository.listStm(ownerId);
    if (isErr(listResult)) return err(listResult.error);
    const rows = listResult.value.slice(-n);
    return ok(rows.map((row) => ({
      id: row.id,
      ownerId: row.ownerId,
      turnId: row.turnId,
      role: row.role,
      content: row.content,
      emotion: row.emotion,
      turnIndex: row.turnIndex,
      createdAt: row.createdAt
    })));
  }

  async triggerSummary(characterId: string): Promise<Result<void, MemoryError>> {
    const ownerId = characterId;
    const storeResult = await this.ensureStore(ownerId);
    if (isErr(storeResult)) return err(storeResult.error);
    const store = storeResult.value;

    const stmResult = await this.repository.listStm(ownerId);
    if (isErr(stmResult)) return err(stmResult.error);

    const turns = stmResult.value
      .filter((row) => row.turnIndex > store.meta.lastSummaryTurnIndex)
      .map((row) => ({
        role: row.role,
        content: row.content,
        emotion: row.emotion
      }));

    if (turns.length === 0) return ok(undefined);

    const summaryResult = await this.generateSummaryWithRetry(ownerId, turns, store);
    if (isErr(summaryResult)) return err(summaryResult.error);

    const summary = summaryResult.value;
    const addResult = await this.repository.addSummary({
      id: summary.id,
      ownerId,
      summary: summary.summary,
      mood: summary.mood,
      goals: summary.goals,
      sourceTurnId: summary.sourceTurnId,
      importanceScore: summary.importanceScore,
      tags: summary.tags,
      emotion: summary.emotion,
      createdAt: summary.createdAt
    });
    if (isErr(addResult)) return err(addResult.error);

    store.meta.lastSummaryTurnIndex = store.meta.currentTurnIndex;
    store.meta.consecutiveSummaryFailures = 0;
    store.meta.updatedAt = toIsoString();
    await this.repository.upsertStoreMeta({
      ownerId,
      currentTurnIndex: store.meta.currentTurnIndex,
      lastSummaryTurnIndex: store.meta.lastSummaryTurnIndex,
      consecutiveSummaryFailures: store.meta.consecutiveSummaryFailures,
      updatedAt: store.meta.updatedAt
    });

    if (shouldArchiveSummary(summary)) {
      await this.archiveToLTM(ownerId, {
        content: summary.summary,
        category: 'event',
        sourceTurnId: summary.sourceTurnId,
        importance: summary.importanceScore
      });
    }

    return ok(undefined);
  }

  async getCurrentSummary(characterId: string): Promise<Result<EpisodeSummary | null, MemoryError>> {
    const ownerId = characterId;
    const summaryResult = await this.repository.getLatestSummary(ownerId);
    if (isErr(summaryResult)) return err(summaryResult.error);
    const row = summaryResult.value;
    if (!row) return ok(null);
    return ok({
      id: row.id,
      ownerId: row.ownerId,
      summary: row.summary,
      mood: row.mood,
      goals: row.goals,
      sourceTurnId: row.sourceTurnId,
      importanceScore: row.importanceScore,
      tags: row.tags,
      emotion: row.emotion,
      createdAt: row.createdAt
    });
  }

  async retrieveMemories(
    characterId: string,
    query: string,
    topK?: number,
    minSimilarity?: number,
    options?: MemoryOperationOptions
  ): Promise<Result<SemanticMemory[], MemoryError>> {
    if (!this.enabled) return err(rejectMemory('MEMORY_DISABLED', 'Memory system disabled'));
    if (options?.signal?.aborted) return err(failMemory('CANCELLED', 'Retrieve memory cancelled'));

    const ownerId = characterId;
    const storeResult = await this.ensureStore(ownerId);
    if (isErr(storeResult)) return err(storeResult.error);
    const store = storeResult.value;

    const embedResult = await this.embeddingProvider.embed([query], {
      signal: options?.signal,
      timeoutMs: options?.timeoutMs
    });
    if (isErr(embedResult)) return err(embedResult.error);

    const vector = embedResult.value[0];
    if (!vector) return err(failMemory('EMBEDDING_FAILED', 'Empty embedding result'));
    const queryResult = await this.vectorStore.query({
      ownerId,
      vector,
      topK: topK ?? store.config.ltmDefaultTopK,
      minSimilarity: minSimilarity ?? store.config.minSimilarity
    });
    if (isErr(queryResult)) return err(queryResult.error);

    const ids = queryResult.value.map((item) => item.id);
    const ltmResult = await this.repository.listLtm(ownerId);
    if (isErr(ltmResult)) return err(ltmResult.error);

    const ltmMap = new Map(ltmResult.value.map((row) => [row.id, row]));
    const memories = ids
      .map((id) => ltmMap.get(id))
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .map((row) => ({
        id: row.id,
        ownerId: row.ownerId,
        content: row.content,
        embedding: row.embedding,
        sourceTurnId: row.sourceTurnId,
        importance: row.importance,
        canonStatus: row.canonStatus,
        scope: row.scope,
        createdAt: row.createdAt,
        lastAccessAt: row.lastAccessAt,
        accessCount: row.accessCount
      }));

    return ok(memories);
  }

  async retrieveSharedMemories(
    characterIds: string[],
    query: string,
    topK?: number,
    options?: MemoryOperationOptions
  ): Promise<Result<SemanticMemory[], MemoryError>> {
    if (!this.enabled) return err(rejectMemory('MEMORY_DISABLED', 'Memory system disabled'));
    if (options?.signal?.aborted) return err(failMemory('CANCELLED', 'Retrieve memory cancelled'));
    if (!Array.isArray(characterIds) || characterIds.length === 0) return ok([]);

    const embedResult = await this.embeddingProvider.embed([query], {
      signal: options?.signal,
      timeoutMs: options?.timeoutMs
    });
    if (isErr(embedResult)) return err(embedResult.error);

    const vector = embedResult.value[0];
    if (!vector) return err(failMemory('EMBEDDING_FAILED', 'Empty embedding result'));
    const scored: Array<{ score: number; memory: SemanticMemory }> = [];
    const DEFAULT_TOP_K = 3;
    let maxConfigTopK = DEFAULT_TOP_K;

    for (const ownerId of characterIds) {
      const storeResult = await this.loadStore(ownerId);
      if (isErr(storeResult)) return err(storeResult.error);
      if (!storeResult.value) continue;
      const store = storeResult.value;
      const storeTopK = topK ?? store.config.ltmDefaultTopK;
      maxConfigTopK = Math.max(maxConfigTopK, storeTopK);
      const queryResult = await this.vectorStore.query({
        ownerId,
        vector,
        topK: storeTopK,
        minSimilarity: store.config.minSimilarity
      });
      if (isErr(queryResult)) return err(queryResult.error);
      const ids = new Set(queryResult.value.map((item) => item.id));
      const scoreMap = new Map<string, number>(queryResult.value.map((item) => [item.id, item.score]));
      const ltmResult = await this.repository.listLtm(ownerId);
      if (isErr(ltmResult)) return err(ltmResult.error);
      for (const row of ltmResult.value) {
        if (row.scope !== 'shared') continue;
        if (!ids.has(row.id)) continue;
        const score = scoreMap.get(row.id) ?? 0;
        scored.push({
          score,
          memory: {
            id: row.id,
            ownerId: row.ownerId,
            content: row.content,
            embedding: row.embedding,
            sourceTurnId: row.sourceTurnId,
            importance: row.importance,
            canonStatus: row.canonStatus,
            scope: row.scope,
            createdAt: row.createdAt,
            lastAccessAt: row.lastAccessAt,
            accessCount: row.accessCount
          }
        });
      }
    }

    const finalTopK = topK ?? maxConfigTopK;

    const deduped = new Map<string, { score: number; memory: SemanticMemory }>();
    scored.forEach((item) => {
      const existing = deduped.get(item.memory.id);
      if (!existing || item.score > existing.score) {
        deduped.set(item.memory.id, item);
      }
    });

    return ok(
      Array.from(deduped.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, finalTopK)
        .map((item) => item.memory)
    );
  }

  async archiveToLTM(characterId: string, memory: ArchivePayload, options?: MemoryOperationOptions): Promise<Result<void, MemoryError>> {
    if (!this.enabled) return err(rejectMemory('MEMORY_DISABLED', 'Memory system disabled'));
    if (options?.signal?.aborted) return err(failMemory('CANCELLED', 'Archive memory cancelled'));

    const ownerId = characterId;
    const storeResult = await this.ensureStore(ownerId);
    if (isErr(storeResult)) return err(storeResult.error);
    const store = storeResult.value;

    const embedResult = await this.embeddingProvider.embed([memory.content], {
      signal: options?.signal,
      timeoutMs: options?.timeoutMs
    });
    if (isErr(embedResult)) return err(embedResult.error);

    const embedding = embedResult.value[0];
    if (!embedding) return err(failMemory('EMBEDDING_FAILED', 'Empty embedding result'));
    const id = createStableId('ltm', [ownerId, memory.sourceTurnId, memory.content]);
    const createdAt = toIsoString();

    const upsertResult = await this.repository.upsertLtm({
      id,
      ownerId,
      content: memory.content,
      embedding,
      sourceTurnId: memory.sourceTurnId,
      importance: memory.importance ?? 0.5,
      canonStatus: 'pending_check',
      scope: memory.scope ?? 'private',
      createdAt,
      lastAccessAt: null,
      accessCount: 0
    });
    if (isErr(upsertResult)) return err(upsertResult.error);

    const vectorResult = await this.vectorStore.upsert({
      id,
      ownerId,
      vector: embedding,
      createdAt,
      importance: memory.importance ?? 0.5
    });
    if (isErr(vectorResult)) return err(vectorResult.error);

    await this.enforceLtmLimit(ownerId, store.config.ltmMaxEntries);

    return ok(undefined);
  }

  async deleteMemory(characterId: string, memoryId: string): Promise<Result<void, MemoryError>> {
    const ownerId = characterId;
    const deleteResult = await this.repository.deleteLtm(ownerId, memoryId);
    if (isErr(deleteResult)) return err(deleteResult.error);
    const vectorDelete = await this.vectorStore.delete(ownerId, memoryId);
    if (isErr(vectorDelete)) return err(vectorDelete.error);
    return ok(undefined);
  }

  async extractFacts(
    characterId: string,
    turnId: string,
    content: string
  ): Promise<Result<MemoryFact[], MemoryError>> {
    const ownerId = characterId;
    const extracted = await this.factExtractor.extract(content, { ownerId, sourceTurnId: turnId });
    if (isErr(extracted)) return err(extracted.error);

    let shouldValidate = true;
    let allowExtraction = true;
    const configResult = await this.getConfig(ownerId);
    if (!isErr(configResult)) {
      shouldValidate = configResult.value.enableCanonValidation;
      allowExtraction = configResult.value.autoExtractFacts;
    } else {
      this.handleError(configResult.error);
    }

    if (!allowExtraction) return ok([]);

    const validated: MemoryFact[] = [];
    for (const fact of extracted.value) {
      if (shouldValidate) {
        const validation = await this.validateAgainstCanon(fact);
        if (isErr(validation)) return err(validation.error);
        validated.push({
          ...fact,
          canonStatus: validation.value.status,
          updatedAt: toIsoString()
        });
        continue;
      }
      validated.push({
        ...fact,
        canonStatus: 'valid',
        updatedAt: toIsoString()
      });
    }

    const saveResult = await this.repository.upsertFacts(validated.map((fact) => ({
      id: fact.id,
      ownerId: fact.ownerId,
      key: fact.key,
      value: fact.value,
      sourceTurnId: fact.sourceTurnId,
      confidence: fact.confidence,
      canonStatus: fact.canonStatus,
      conflictStatus: fact.conflictStatus,
      factHistory: fact.factHistory,
      createdAt: fact.createdAt,
      updatedAt: fact.updatedAt
    })));
    if (isErr(saveResult)) return err(saveResult.error);

    return ok(validated);
  }

  async getFacts(characterId: string, keyPrefix?: string): Promise<Result<MemoryFact[], MemoryError>> {
    const ownerId = characterId;
    const listResult = await this.repository.listFacts(ownerId, keyPrefix);
    if (isErr(listResult)) return err(listResult.error);
    return ok(listResult.value.map((row) => ({
      id: row.id,
      ownerId: row.ownerId,
      key: row.key,
      value: row.value,
      sourceTurnId: row.sourceTurnId,
      confidence: row.confidence,
      canonStatus: row.canonStatus,
      conflictStatus: row.conflictStatus,
      factHistory: row.factHistory,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    })));
  }

  async deleteFact(characterId: string, factId: string): Promise<Result<void, MemoryError>> {
    const ownerId = characterId;
    return this.repository.deleteFact(ownerId, factId);
  }

  async correctFact(characterId: string, factId: string, newValue: string): Promise<Result<void, MemoryError>> {
    const ownerId = characterId;
    const existing = await this.repository.getFact(ownerId, factId);
    if (isErr(existing)) return err(existing.error);
    if (!existing.value) {
      return err(rejectMemory('INVALID_INPUT', 'Fact not found', { ownerId, factId }));
    }

    const row = existing.value;
    const now = toIsoString();
    const nextHistory = [
      ...row.factHistory,
      {
        value: row.value,
        sourceTurnId: row.sourceTurnId,
        confidence: row.confidence,
        updatedAt: row.updatedAt
      }
    ];

    const upsert = await this.repository.upsertFacts([
      {
        ...row,
        value: String(newValue),
        canonStatus: 'pending_check',
        factHistory: nextHistory,
        updatedAt: now
      }
    ]);
    if (isErr(upsert)) return err(upsert.error);
    return ok(undefined);
  }

  async validateAgainstCanon(
    fact: MemoryFact,
    _canonConstraints?: CanonConstraint[]
  ): Promise<Result<ValidationResult, MemoryError>> {
    const validation = await this.canonValidator.validateFact(fact);
    if (isErr(validation)) return err(validation.error);
    const status = validation.value.status;
    const valid = status === 'valid';
    return ok({ valid, status, conflicts: valid ? undefined : [] });
  }

  async getMemoryAudit(characterId: string, memoryId: string): Promise<Result<MemoryAuditInfo, MemoryError>> {
    const ownerId = characterId;
    const ltmResult = await this.repository.getLtm(ownerId, memoryId);
    if (isErr(ltmResult)) return err(ltmResult.error);

    let memory: SemanticMemory | MemoryFact | null = null;
    if (ltmResult.value) {
      const row = ltmResult.value;
      memory = {
        id: row.id,
        ownerId: row.ownerId,
        content: row.content,
        embedding: row.embedding,
        sourceTurnId: row.sourceTurnId,
        importance: row.importance,
        canonStatus: row.canonStatus,
        scope: row.scope,
        createdAt: row.createdAt,
        lastAccessAt: row.lastAccessAt,
        accessCount: row.accessCount
      };
    } else {
      const factResult = await this.repository.getFact(ownerId, memoryId);
      if (isErr(factResult)) return err(factResult.error);
      if (factResult.value) {
        const row = factResult.value;
        memory = {
          id: row.id,
          ownerId: row.ownerId,
          key: row.key,
          value: row.value,
          sourceTurnId: row.sourceTurnId,
          confidence: row.confidence,
          canonStatus: row.canonStatus,
          conflictStatus: row.conflictStatus,
          factHistory: row.factHistory,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt
        };
      }
    }

    if (!memory) {
      return err(rejectMemory('INVALID_INPUT', 'Memory not found', { ownerId, memoryId }));
    }

    let sourceTurn: ShortTermMemory | null = null;
    const turnId = (memory as SemanticMemory | MemoryFact).sourceTurnId;
    if (turnId) {
      const stmResult = await this.repository.listStm(ownerId);
      if (isErr(stmResult)) return err(stmResult.error);
      const match = stmResult.value.find((row) => row.turnId === turnId);
      if (match) {
        sourceTurn = {
          id: match.id,
          ownerId: match.ownerId,
          turnId: match.turnId,
          role: match.role,
          content: match.content,
          emotion: match.emotion,
          turnIndex: match.turnIndex,
          createdAt: match.createdAt
        };
      }
    }

    return ok({
      memory,
      sourceTurn,
      usageHistory: []
    });
  }

  async shareMemory(characterId: string, memoryId: string, targetScope: 'shared' = 'shared'): Promise<Result<void, MemoryError>> {
    if (!this.enabled) return err(rejectMemory('MEMORY_DISABLED', 'Memory system disabled'));
    if (targetScope !== 'shared') {
      return err(rejectMemory('INVALID_INPUT', 'Only shared scope is supported'));
    }
    const ownerId = characterId;
    const existing = await this.repository.getLtm(ownerId, memoryId);
    if (isErr(existing)) return err(existing.error);
    if (!existing.value) {
      return err(rejectMemory('INVALID_INPUT', 'Memory not found', { ownerId, memoryId }));
    }
    if (existing.value.scope === targetScope) return ok(undefined);
    const upsertResult = await this.repository.upsertLtm({
      ...existing.value,
      scope: targetScope
    });
    if (isErr(upsertResult)) return err(upsertResult.error);
    return ok(undefined);
  }

  async buildMemoryContext(characterId: string, query: string): Promise<Result<MemoryContext, MemoryError>> {
    const summaryResult = await this.getCurrentSummary(characterId);
    if (isErr(summaryResult)) return err(summaryResult.error);

    const configResult = await this.getConfig(characterId);
    if (isErr(configResult)) return err(configResult.error);

    const recentResult = await this.getRecentTurns(characterId, configResult.value.stmMaxTurns);
    if (isErr(recentResult)) return err(recentResult.error);

    const memoriesResult = await this.retrieveMemories(characterId, query);
    if (isErr(memoriesResult)) return err(memoriesResult.error);

    const factsResult = await this.getFacts(characterId);
    if (isErr(factsResult)) return err(factsResult.error);

    const factsLimit = Math.max(1, Math.min(10, configResult.value.ltmDefaultTopK * 2));
    const facts = factsResult.value
      .slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, factsLimit);

    return ok({
      stm: formatStmContext(recentResult.value),
      mtm: formatSummaryContext(summaryResult.value),
      ltm: formatLtmContext(memoriesResult.value),
      facts: formatFactsContext(facts)
    });
  }

  private async ensureStore(ownerId: string): Promise<Result<MemoryStore, MemoryError>> {
    const storeResult = await this.loadStore(ownerId);
    if (isErr(storeResult)) return err(storeResult.error);
    if (storeResult.value) return ok(storeResult.value);
    return this.initStore(ownerId);
  }

  private async rebuildVectorIndex(ownerId: string): Promise<void> {
    const ltmResult = await this.repository.listLtm(ownerId);
    if (isErr(ltmResult)) {
      this.handleError(ltmResult.error);
      return;
    }
    for (const row of ltmResult.value) {
      await this.vectorStore.upsert({
        id: row.id,
        ownerId,
        vector: row.embedding,
        createdAt: row.createdAt,
        importance: row.importance
      });
    }
  }

  private async enforceStmLimit(ownerId: string, maxTurns: number): Promise<void> {
    const listResult = await this.repository.listStm(ownerId);
    if (isErr(listResult)) {
      this.handleError(listResult.error);
      return;
    }
    const rows = listResult.value;
    if (rows.length <= maxTurns) return;
    const overflow = rows.length - maxTurns;
    const toRemove = rows.slice(0, overflow).map((row) => row.id);
    const deleteResult = await this.repository.deleteStmByIds(toRemove);
    if (isErr(deleteResult)) {
      this.handleError(deleteResult.error);
    }
  }

  private async enforceLtmLimit(ownerId: string, maxEntries: number): Promise<void> {
    const listResult = await this.repository.listLtm(ownerId);
    if (isErr(listResult)) {
      this.handleError(listResult.error);
      return;
    }
    const rows = listResult.value;
    if (rows.length <= maxEntries) return;
    const sorted = [...rows].sort((a, b) => a.importance - b.importance);
    const overflow = rows.length - maxEntries;
    const toRemove = sorted.slice(0, overflow);
    for (const row of toRemove) {
      await this.repository.deleteLtm(ownerId, row.id);
      await this.vectorStore.delete(ownerId, row.id);
    }
  }

  private async generateSummaryWithRetry(
    ownerId: string,
    turns: DialogueTurn[],
    store: MemoryStore
  ): Promise<Result<EpisodeSummary, MemoryError>> {
    let attempt = 0;
    while (attempt <= store.config.summaryMaxRetries) {
      try {
        const sourceTurnId = createStableId('summary', [ownerId, store.meta.currentTurnIndex]);
        const summaryResult = await this.summaryProvider.summarize(turns, {
          ownerId,
          sourceTurnId,
          emotion: turns[turns.length - 1]?.emotion
        });
        if (!isErr(summaryResult)) return summaryResult;
        this.handleError(summaryResult.error);
      } catch (error) {
        this.handleError(
          failMemory('SUMMARY_FAILED', 'Summary generation failed', {
            message: error instanceof Error ? error.message : String(error)
          })
        );
      }
      attempt += 1;
      if (attempt <= store.config.summaryMaxRetries) {
        await sleep(store.config.summaryRetryDelayMs);
      }
    }

    store.meta.consecutiveSummaryFailures += 1;
    await this.repository.upsertStoreMeta({
      ownerId,
      currentTurnIndex: store.meta.currentTurnIndex,
      lastSummaryTurnIndex: store.meta.lastSummaryTurnIndex,
      consecutiveSummaryFailures: store.meta.consecutiveSummaryFailures,
      updatedAt: toIsoString()
    });

    return err(
      failMemory('SUMMARY_FAILED', 'Summary generation exhausted', {
        ownerId,
        attempts: store.config.summaryMaxRetries
      })
    );
  }

  private async safeTriggerSummary(ownerId: string): Promise<void> {
    const result = await this.triggerSummary(ownerId);
    if (isErr(result)) this.handleError(result.error);
  }

  private handleError(error: MemoryError): void {
    if (this.onError) this.onError(error);
  }
}

const resolveVectorDimension = (dim?: number): number => {
  if (dim !== undefined) {
    const parsed = Number(dim);
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  }
  return 1024;
};

const shouldArchiveSummary = (summary: EpisodeSummary): boolean => {
  if (summary.importanceScore > 0.5) return true;
  const keyTags = ['confession', 'conflict', 'milestone', 'revelation', 'decision'];
  if (summary.tags.some((tag) => keyTags.includes(tag))) return true;
  const intensity = summary.emotion?.intensity ?? 0;
  return intensity > 0.7;
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
