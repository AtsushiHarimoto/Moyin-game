/**
 * VN Execution Trace / Logging System (Framework-Agnostic)
 * Purpose: Record, persist, and export VN engine execution traces
 * for debugging and diagnostics.
 *
 * Configuration is injected via VnTraceConfig rather than reading
 * environment variables directly, keeping this module framework-agnostic.
 */
import type { TraceEventType } from './VnExecutionEngine';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TraceEvent = {
  ts: string;
  seq: number;
  type: TraceEventType;
  phase?: string;
  sceneId?: string;
  payload?: Record<string, unknown>;
};

type TraceContext = {
  storyKey?: string | null;
  packVersion?: string | null;
  sessionId?: string | null;
  llmConversationId?: string | null;
  llmResponseId?: string | null;
  llmCandidateId?: string | null;
  laneKey?: string | null;
};

type TraceSnapshot = {
  meta: {
    app: string;
    generatedAt: string;
    mode: string;
    storyKey?: string | null;
    packVersion?: string | null;
    sessionId?: string | null;
    llmConversationId?: string | null;
    llmResponseId?: string | null;
    llmCandidateId?: string | null;
    laneKey?: string | null;
  };
  events: TraceEvent[];
};

type VnTraceConfig = {
  /** Whether tracing is enabled at all. */
  isEnabled: boolean;
  /** Whether to persist the buffer to storage. */
  isPersist: boolean;
  /** Whether the app is in development mode. */
  isDev: boolean;
  /** App identifier used in snapshots. */
  appName?: string;
  /** Maximum number of events to keep in the buffer. */
  maxEntries?: number;
  /** Optional custom download function. Overrides the default DOM-based download. */
  downloadFn?: (json: string, filename: string) => void;
};

// ---------------------------------------------------------------------------
// Storage helpers (safe for environments without localStorage)
// ---------------------------------------------------------------------------

function safeGetItem(key: string): string | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function safeRemoveItem(key: string): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// VnTrace class
// ---------------------------------------------------------------------------

const TRACE_STORAGE_KEY = 'VN_TRACE_BUFFER';
const DEV_MODE_KEY = 'DEV_MODE_ENABLED';
const MAX_ENTRIES_DEFAULT = 300;

export class VnTrace {
  private buffer: TraceEvent[] = [];
  private seq = 0;
  private context: TraceContext = {};
  private maxEntries: number;
  private config: VnTraceConfig;

  constructor(config: VnTraceConfig) {
    this.config = config;
    this.maxEntries = config.maxEntries ?? MAX_ENTRIES_DEFAULT;
    this.loadBuffer();
  }

  // -- Dev mode ---------------------------------------------------------

  isDevModeEnabled(): boolean {
    return safeGetItem(DEV_MODE_KEY) === 'true';
  }

  setDevModeEnabled(enabled: boolean): void {
    safeSetItem(DEV_MODE_KEY, String(enabled));
  }

  // -- Enabled check ----------------------------------------------------

  isTraceEnabled(): boolean {
    return this.config.isEnabled && (this.config.isDev || this.isDevModeEnabled());
  }

  // -- Context ----------------------------------------------------------

  setTraceContext(next: Partial<TraceContext>): void {
    this.context = { ...this.context, ...next };
    if (this.isTraceEnabled()) {
      this.persistBuffer();
    }
  }

  getTraceContext(): Readonly<TraceContext> {
    return { ...this.context };
  }

  // -- Snapshot ---------------------------------------------------------

  getTraceSnapshot(): TraceSnapshot {
    const mode = this.isTraceEnabled() ? 'dev' : 'prod';
    return {
      meta: {
        app: this.config.appName ?? 'moyin-game-v2',
        generatedAt: new Date().toISOString(),
        mode,
        storyKey: this.context.storyKey ?? null,
        packVersion: this.context.packVersion ?? null,
        sessionId: this.context.sessionId ?? null,
        llmConversationId: this.context.llmConversationId ?? null,
        llmResponseId: this.context.llmResponseId ?? null,
        llmCandidateId: this.context.llmCandidateId ?? null,
        laneKey: this.context.laneKey ?? null,
      },
      events: [...this.buffer],
    };
  }

  // -- Push event -------------------------------------------------------

  pushTraceEvent(
    event: Omit<TraceEvent, 'ts' | 'seq'> & { ts?: string },
  ): void {
    if (!this.isTraceEnabled()) {
      if (this.config.isDev) {
        console.debug('[VnTrace] Skip push (disabled)', event.type);
      }
      return;
    }

    const entry: TraceEvent = {
      ts: event.ts ?? new Date().toISOString(),
      seq: this.seq + 1,
      type: event.type,
      phase: event.phase,
      sceneId: event.sceneId,
      payload: event.payload,
    };
    this.seq += 1;
    this.buffer.push(entry);

    if (this.buffer.length > this.maxEntries) {
      this.buffer = this.buffer.slice(-this.maxEntries);
    }
    this.persistBuffer();
  }

  // -- Clear ------------------------------------------------------------

  clearTraceBuffer(): void {
    this.buffer = [];
    this.seq = 0;
    safeRemoveItem(TRACE_STORAGE_KEY);
  }

  // -- Max entries ------------------------------------------------------

  setTraceMaxEntries(size: number): void {
    if (!Number.isFinite(size) || size <= 0) return;
    this.maxEntries = Math.floor(size);
    if (this.buffer.length > this.maxEntries) {
      this.buffer = this.buffer.slice(-this.maxEntries);
    }
    if (this.isTraceEnabled()) {
      this.persistBuffer();
    }
  }

  // -- Export -----------------------------------------------------------

  exportTraceAndClear(
    metaOverride?: Partial<TraceContext>,
  ): { ok: boolean; count: number; reason?: string } {
    if (!this.isTraceEnabled()) {
      return { ok: false, count: 0, reason: 'disabled' };
    }

    const snapshot = this.getTraceSnapshot();
    if (metaOverride) {
      Object.assign(snapshot.meta, metaOverride);
    }

    const json = JSON.stringify(snapshot, null, 2);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `vn-trace-${timestamp}.json`;

    try {
      if (this.config.downloadFn) {
        this.config.downloadFn(json, filename);
      } else if (typeof document !== 'undefined') {
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        return { ok: false, count: this.buffer.length, reason: 'no_download_environment' };
      }
    } catch {
      return { ok: false, count: this.buffer.length, reason: 'download_failed' };
    }

    const count = this.buffer.length;
    this.clearTraceBuffer();
    return { ok: true, count };
  }

  // -- Buffer count (useful for diagnostics) ----------------------------

  getBufferSize(): number {
    return this.buffer.length;
  }

  // -- Internal persistence ---------------------------------------------

  private loadBuffer(): void {
    if (!this.config.isPersist) return;
    const raw = safeGetItem(TRACE_STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as {
        seq?: number;
        events?: TraceEvent[];
        context?: TraceContext;
        maxEntries?: number;
      };
      if (Array.isArray(parsed.events)) this.buffer = parsed.events;
      if (typeof parsed.seq === 'number') this.seq = parsed.seq;
      if (parsed.context) this.context = parsed.context;
      if (typeof parsed.maxEntries === 'number' && parsed.maxEntries > 0) {
        this.maxEntries = parsed.maxEntries;
      }
    } catch {
      this.buffer = [];
      this.seq = 0;
    }
  }

  private persistBuffer(): void {
    if (!this.config.isPersist) return;
    const payload = JSON.stringify({
      seq: this.seq,
      events: this.buffer,
      context: this.context,
      maxEntries: this.maxEntries,
    });
    safeSetItem(TRACE_STORAGE_KEY, payload);
  }
}
