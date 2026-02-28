/**
 * Remote Memory Service (Framework-Agnostic)
 * Purpose: Provide memory service via OS API v1.
 * Changed: window.setTimeout -> setTimeout (platform-agnostic).
 */
import { err, isErr, ok, type Result } from '../utils/result';
import type { MemoryError, MemoryErrorCode } from './memory-errors';
import { failMemory, rejectMemory } from './memory-errors';
import type { MemoryServicePort } from './memory-port';
import type {
  DialogueTurn,
  EpisodeSummary,
  MemoryConfig,
  MemoryContext,
  MemoryFact,
  SemanticMemory
} from './memory-types';
import type { MemoryStore } from './memory-service';

const DEFAULT_TIMEOUT_MS = 12000;
const MEMORY_CODE_ALIASES: Record<string, MemoryErrorCode> = {
  EXTRACTION_FAILED: 'FACT_EXTRACTION_FAILED',
  SUMMARY_TIMEOUT: 'TIMEOUT',
  INVALID_CONFIG: 'INVALID_INPUT',
  LTM_UNAVAILABLE: 'VECTOR_STORE_FAILED'
};
const MEMORY_CODES: MemoryErrorCode[] = [
  'MEMORY_DISABLED',
  'INVALID_INPUT',
  'STORE_NOT_FOUND',
  'DB_READ_FAILED',
  'DB_WRITE_FAILED',
  'VECTOR_STORE_FAILED',
  'EMBEDDING_FAILED',
  'SUMMARY_FAILED',
  'FACT_EXTRACTION_FAILED',
  'CANON_VALIDATION_FAILED',
  'TIMEOUT',
  'CANCELLED'
];
const MEMORY_CODE_SET = new Set(MEMORY_CODES);

type ApiErrorDetails = {
  code?: string;
  message?: string;
  context?: Record<string, unknown>;
};

type ApiResponse<T> = {
  success?: boolean;
  data?: T;
  error?: {
    code?: string;
    message?: string;
    details?: ApiErrorDetails;
  };
};

export type RemoteMemoryServiceOptions = {
  baseUrl: string;
  timeoutMs?: number;
  onError?: (error: MemoryError) => void;
};

export class RemoteMemoryService implements MemoryServicePort {
  private baseUrl: string;
  private timeoutMs: number;
  private onError?: (error: MemoryError) => void;
  private initialized = new Set<string>();

  constructor(options: RemoteMemoryServiceOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.onError = options.onError;
  }

  async initStore(characterId: string): Promise<Result<MemoryStore, MemoryError>> {
    const result = await this.initStoreRaw(characterId);
    if (result.ok) this.initialized.add(characterId);
    return this.report(result);
  }

  async loadStore(characterId: string): Promise<Result<MemoryStore | null, MemoryError>> {
    const result = await this.request<MemoryStore | null>(
      `/api/v1/memory/stores/${encodeURIComponent(characterId)}`,
      { method: 'GET' },
      'DB_READ_FAILED'
    );
    if (result.ok && result.value) this.initialized.add(characterId);
    return this.report(result);
  }

  async setConfig(characterId: string, configPatch: Partial<MemoryConfig>): Promise<Result<void, MemoryError>> {
    const ensured = await this.ensureStore(characterId);
    if (isErr(ensured)) return err(ensured.error);
    const result = await this.request<MemoryConfig>(
      `/api/v1/memory/stores/${encodeURIComponent(characterId)}/config`,
      { method: 'POST', body: configPatch },
      'DB_WRITE_FAILED'
    );
    if (isErr(result)) return this.report(err(result.error));
    return this.report(ok(undefined));
  }

  async getConfig(characterId: string): Promise<Result<MemoryConfig, MemoryError>> {
    const ensured = await this.ensureStore(characterId);
    if (isErr(ensured)) return err(ensured.error);
    const result = await this.request<MemoryConfig>(
      `/api/v1/memory/stores/${encodeURIComponent(characterId)}/config`,
      { method: 'GET' },
      'DB_READ_FAILED'
    );
    return this.report(result);
  }

  async appendTurn(characterId: string, turn: DialogueTurn): Promise<Result<string, MemoryError>> {
    const ensured = await this.ensureStore(characterId);
    if (isErr(ensured)) return err(ensured.error);
    const result = await this.request<{ turnId: string }>(
      `/api/v1/memory/${encodeURIComponent(characterId)}/turns`,
      { method: 'POST', body: turn },
      'DB_WRITE_FAILED'
    );
    if (isErr(result)) return this.report<string>(err(result.error));
    if (!result.value?.turnId) {
      return this.report<string>(err(rejectMemory('INVALID_INPUT', 'turnId missing')));
    }
    return this.report(ok(result.value.turnId));
  }

  async extractFacts(
    characterId: string,
    turnId: string,
    content: string
  ): Promise<Result<MemoryFact[], MemoryError>> {
    const ensured = await this.ensureStore(characterId);
    if (isErr(ensured)) return err(ensured.error);
    const result = await this.request<MemoryFact[]>(
      `/api/v1/memory/${encodeURIComponent(characterId)}/facts`,
      { method: 'POST', body: { turnId, content } },
      'FACT_EXTRACTION_FAILED'
    );
    return this.report(result);
  }

  async triggerSummary(characterId: string): Promise<Result<void, MemoryError>> {
    const ensured = await this.ensureStore(characterId);
    if (isErr(ensured)) return err(ensured.error);
    const result = await this.request<{ status: string }>(
      `/api/v1/memory/${encodeURIComponent(characterId)}/summary`,
      { method: 'POST', body: {} },
      'SUMMARY_FAILED'
    );
    if (isErr(result)) return this.report(err(result.error));
    return this.report(ok(undefined));
  }

  async getCurrentSummary(characterId: string): Promise<Result<EpisodeSummary | null, MemoryError>> {
    const ensured = await this.ensureStore(characterId);
    if (isErr(ensured)) return err(ensured.error);
    const result = await this.request<EpisodeSummary | null>(
      `/api/v1/memory/${encodeURIComponent(characterId)}/summary`,
      { method: 'GET' },
      'DB_READ_FAILED'
    );
    return this.report(result);
  }

  async buildMemoryContext(characterId: string, query: string): Promise<Result<MemoryContext, MemoryError>> {
    const ensured = await this.ensureStore(characterId);
    if (isErr(ensured)) return err(ensured.error);
    const result = await this.request<MemoryContext>(
      `/api/v1/memory/${encodeURIComponent(characterId)}/context`,
      { method: 'POST', body: { query } },
      'DB_READ_FAILED'
    );
    return this.report(result);
  }

  async retrieveSharedMemories(
    characterIds: string[],
    query: string,
    topK?: number
  ): Promise<Result<SemanticMemory[], MemoryError>> {
    const result = await this.request<SemanticMemory[]>(
      `/api/v1/memory/shared/search`,
      {
        method: 'POST',
        body: { characterIds, query, topK }
      },
      'DB_READ_FAILED'
    );
    return this.report(result);
  }

  async shareMemory(
    characterId: string,
    memoryId: string,
    targetScope: 'shared' = 'shared'
  ): Promise<Result<void, MemoryError>> {
    const ensured = await this.ensureStore(characterId);
    if (isErr(ensured)) return err(ensured.error);
    const result = await this.request<{ status: string }>(
      `/api/v1/memory/${encodeURIComponent(characterId)}/memories/${encodeURIComponent(memoryId)}/share`,
      { method: 'POST', body: { targetScope } },
      'DB_WRITE_FAILED'
    );
    if (isErr(result)) return this.report(err(result.error));
    return this.report(ok(undefined));
  }

  private async ensureStore(characterId: string): Promise<Result<void, MemoryError>> {
    if (this.initialized.has(characterId)) return ok(undefined);
    const result = await this.initStoreRaw(characterId);
    if (result.ok) this.initialized.add(characterId);
    if (isErr(result)) return err(result.error);
    return ok(undefined);
  }

  private async initStoreRaw(characterId: string): Promise<Result<MemoryStore, MemoryError>> {
    return this.request<MemoryStore>(
      `/api/v1/memory/stores/${encodeURIComponent(characterId)}/init`,
      { method: 'POST', body: {} },
      'DB_WRITE_FAILED'
    );
  }

  private report<T>(result: Result<T, MemoryError>): Result<T, MemoryError> {
    if (isErr(result)) {
      this.onError?.(result.error);
    }
    return result;
  }

  private async request<T>(
    path: string,
    options: { method: 'GET' | 'POST'; body?: unknown },
    fallbackCode: MemoryErrorCode
  ): Promise<Result<T, MemoryError>> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: options.method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: options.method === 'GET' ? undefined : JSON.stringify(options.body ?? {}),
        signal: controller.signal
      });
      const status = response.status;
      const parsed = await this.parseJson<T>(response);
      if ('parseError' in parsed) {
        return err(failMemory(fallbackCode, 'JSON parse failed'));
      }
      if ('structureError' in parsed) {
        return err(rejectMemory('INVALID_INPUT', 'Invalid response structure'));
      }
      const payload = parsed.result;
      if (!response.ok || !payload?.success) {
        return err(this.buildError(status, payload, fallbackCode));
      }
      if (payload.data === undefined || payload.data === null) {
        return err(rejectMemory('INVALID_INPUT', 'Response data missing'));
      }
      return ok(payload.data as T);
    } catch (error: unknown) {
      const errorName =
        error instanceof Error
          ? error.name
          : typeof error === 'object' && error !== null && 'name' in error
            ? String((error as { name?: unknown }).name ?? '')
            : '';
      if (errorName === 'AbortError') {
        return err(failMemory('TIMEOUT', 'Memory service timeout'));
      }
      const message = error instanceof Error ? error.message : String(error);
      return err(failMemory(fallbackCode, 'Memory service connection failed', { error: message }));
    } finally {
      clearTimeout(timeout);
    }
  }

  private async parseJson<T>(response: Response): Promise<{ result: ApiResponse<T> } | { parseError: true } | { structureError: true }> {
    let raw: unknown;
    try {
      raw = await response.json();
    } catch {
      return { parseError: true };
    }
    if (typeof raw !== 'object' || raw === null) {
      return { structureError: true };
    }
    return { result: raw as ApiResponse<T> };
  }

  private buildError(
    status: number | null,
    payload: ApiResponse<unknown> | null,
    fallbackCode: MemoryErrorCode
  ): MemoryError {
    const details = payload?.error?.details;
    const rawCode = typeof details?.code === 'string' ? details.code : undefined;
    const mappedCode = this.normalizeMemoryCode(rawCode, fallbackCode);
    const message =
      details?.message || payload?.error?.message || 'Memory service response error';
    const meta = {
      status,
      errorCode: payload?.error?.code,
      rawCode,
      context: details?.context
    };
    if (status !== null && status >= 400 && status < 500) {
      return rejectMemory(mappedCode, message, meta);
    }
    return failMemory(mappedCode, message, meta);
  }

  private normalizeMemoryCode(rawCode: string | undefined, fallback: MemoryErrorCode): MemoryErrorCode {
    if (!rawCode) return fallback;
    const alias = MEMORY_CODE_ALIASES[rawCode];
    if (alias) return alias;
    if (MEMORY_CODE_SET.has(rawCode as MemoryErrorCode)) {
      return rawCode as MemoryErrorCode;
    }
    return fallback;
  }
}
