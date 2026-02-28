/**
 * VN Runtime Helper Functions (Pure Functions)
 * Purpose: Provide pure utility functions for the VN runtime.
 * No Vue dependencies. No side effects.
 */
import type { Frame } from '../providers/types';

const LLM_RESPONSE_ALLOWED_KEYS = new Set([
  'frames',
  'proposals',
  'stageHints',
  'rawText',
  'rawJson',
  'providerMeta'
]);
const LLM_MAX_FRAMES = 3;
const FALLBACK_FRAME_SPEAKER = 'NARRATOR';
const FALLBACK_FRAME_TEXT = '...';

type ValidationSignal = {type: string; id: string};
type RejectedValidationSignal = {type: string; id: string; reasonCode: string};

type ValidationAudit = {
  acceptedKeys: string[];
  rejectedKeys: string[];
  reasonCodes: string[];
  warnings: string[];
  frameCountBefore: number;
  frameCountAfter: number;
  fallbackUsed: boolean;
  fallbackReason?: string;
  acceptedSignals: ValidationSignal[];
  rejectedSignals: RejectedValidationSignal[];
  timestamp?: number;
};

type RelationshipDeltaInput = {
  fromWho?: string;
  toWho?: string;
  trackKey?: string;
  delta?: unknown;
  [key: string]: unknown;
};

type RelationshipDeltaOutput = {
  fromWho: string;
  toWho: string;
  trackKey: string;
  delta: number;
};

type EventSignalInput = string | { eventId?: string; signal?: string; [key: string]: unknown };

type LlmRawInput = {
  frames?: unknown;
  proposals?: unknown;
  stageHints?: unknown;
  rawText?: string;
  rawJson?: unknown;
  text?: string;
  [key: string]: unknown;
};

type CommitDeltaResult = {
  flagsSet?: string[];
  completedEventsAdd?: string[];
  relationshipDelta?: RelationshipDeltaOutput[];
  stageDelta?: { sceneId: string };
  choiceDelta?: { choiceId: string; action: 'show' | 'clear' | 'select' };
  endingDelta?: { endingId: string; terminalSceneId?: string };
};

type BuildCommitDeltaParams = {
  inputType: string;
  prevFlags: string[];
  prevEvents: string[];
  result: {
    flagsSet?: string[];
    eventsDone?: string[];
    relationshipDelta?: RelationshipDeltaOutput[];
    nextSceneId?: string;
    choiceView?: { choiceId: string } | null;
    endingId?: string | null;
  };
  getEndingById: (id: string) => { terminalSceneId?: string } | undefined;
};

function createValidationAudit(): ValidationAudit {
  return {
    acceptedKeys: [],
    rejectedKeys: [],
    reasonCodes: [],
    warnings: [],
    frameCountBefore: 0,
    frameCountAfter: 0,
    fallbackUsed: false,
    acceptedSignals: [],
    rejectedSignals: [],
    timestamp: Date.now(),
  };
}

function addAuditReason(audit: ValidationAudit, code: string): void {
  if (!audit.reasonCodes.includes(code)) audit.reasonCodes.push(code);
}

function addAuditWarning(audit: ValidationAudit, key: string): void {
  if (!audit.warnings.includes(key)) audit.warnings.push(key);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export const VnHelper = {
  buildClientTurnKey(sessionId: string | null, seq: number, type: string, sceneId: string, extra?: string): string {
    const base = `${sessionId || 'temp'}:${seq}:${type}:${sceneId}`;
    return extra ? `${base}:${extra}` : base;
  },

  resolveLaneKey(sceneId: string, targetId: string): string {
    return `${sceneId}:${targetId}`;
  },

  formatRelationshipDelta(delta: RelationshipDeltaInput | null | undefined): RelationshipDeltaOutput | null {
    if (!delta) return null;
    return {
      fromWho: delta.fromWho || '',
      toWho: delta.toWho || '',
      trackKey: delta.trackKey || '',
      delta: Number(delta.delta) || 0
    };
  },

  clampDelta(v: number, cap: number): number {
    return Math.min(Math.max(v, -cap), cap);
  },

  isActionAllowed(): boolean { return true; },

  buildLlmRequestSnapshot<T>(payload: T): T { return payload; },

  normalizeProviderResult<T>(result: T): T { return result; },

  createFallbackResponse(reasonCode: string, audit?: ValidationAudit) {
    const nextAudit = audit || createValidationAudit();
    addAuditReason(nextAudit, reasonCode);
    nextAudit.fallbackUsed = true;
    nextAudit.fallbackReason = reasonCode;

    if (reasonCode === 'TIMEOUT') {
      addAuditWarning(nextAudit, 'game.llm.timeout');
    } else if (reasonCode === 'TIMEOUT_AFTER_RETRY' || reasonCode === 'RETRY_EXHAUSTED') {
      addAuditWarning(nextAudit, 'game.llm.retryExhausted');
    } else if (['NON_JSON', 'SCHEMA_MISSING_FRAMES', 'FRAMES_EMPTY', 'INVALID_TYPES', 'FRAMES_NULL'].includes(reasonCode)) {
      addAuditWarning(nextAudit, 'game.llm.parseError');
    } else {
      addAuditWarning(nextAudit, 'game.llm.fallbackMessage');
    }

    const raw = {
      frames: [{ speaker: FALLBACK_FRAME_SPEAKER, text: FALLBACK_FRAME_TEXT }],
      proposals: [],
      stageHints: null,
      rawText: '',
      rawJson: null
    };
    if (!nextAudit.frameCountBefore) nextAudit.frameCountBefore = 0;
    nextAudit.frameCountAfter = raw.frames.length;
    return { raw, audit: nextAudit };
  },

  normalizeLlmResponse(raw: LlmRawInput, audit: ValidationAudit, maxFrames?: number): LlmRawInput {
    const frameLimit = Math.max(1, Math.min(maxFrames || LLM_MAX_FRAMES, LLM_MAX_FRAMES));
    const candidates = Array.isArray(raw.frames) ? raw.frames : [];
    const originalCount = candidates.length;
    const normalized = candidates.filter((frame: unknown) => isPlainObject(frame) && typeof (frame as Record<string, unknown>).text === 'string' && ((frame as Record<string, unknown>).text as string).trim().length > 0);

    if (normalized.length !== originalCount) addAuditReason(audit, 'INVALID_TYPES');

    audit.frameCountBefore = originalCount;
    const trimmed = normalized.slice(0, frameLimit);
    audit.frameCountAfter = trimmed.length;
    if (normalized.length > frameLimit) addAuditReason(audit, 'FRAMES_TRUNCATED');

    raw.frames = trimmed;
    return raw;
  },

  validateLlmSignals(raw: LlmRawInput | null | undefined, audit: ValidationAudit, eventIdSet?: Set<string> | null): void {
    const proposals = Array.isArray(raw?.proposals) ? raw!.proposals : [];
    proposals.forEach((proposal: unknown) => {
      if (!isPlainObject(proposal)) return;
      const p = proposal as Record<string, unknown>;

      if (p.eventSignals !== undefined && !Array.isArray(p.eventSignals)) {
        addAuditReason(audit, 'INVALID_TYPES');
        audit.rejectedSignals.push({ type: 'eventSignals', id: '', reasonCode: 'INVALID_TYPES' });
        return;
      }

      const signals: EventSignalInput[] = [];
      if (Array.isArray(p.eventSignals)) signals.push(...(p.eventSignals as EventSignalInput[]));
      if (p.eventSignal !== undefined) {
        if (typeof p.eventSignal === 'string' || isPlainObject(p.eventSignal)) {
          signals.push(p.eventSignal as EventSignalInput);
        } else {
          addAuditReason(audit, 'INVALID_TYPES');
          audit.rejectedSignals.push({ type: 'eventSignal', id: '', reasonCode: 'INVALID_TYPES' });
        }
      }

      signals.forEach((signal) => {
        let id = '';
        if (typeof signal === 'string') {
          id = signal.trim();
        } else if (isPlainObject(signal)) {
          id = String(signal.eventId || signal.signal || '').trim();
        }

        if (!id) {
          addAuditReason(audit, 'INVALID_TYPES');
          audit.rejectedSignals.push({ type: 'eventSignal', id: '', reasonCode: 'INVALID_TYPES' });
          return;
        }

        if (eventIdSet && eventIdSet.size && !eventIdSet.has(id)) {
          addAuditReason(audit, 'UNKNOWN_EVENT_ID');
          audit.rejectedSignals.push({ type: 'eventSignal', id, reasonCode: 'UNKNOWN_EVENT_ID' });
          return;
        }

        audit.acceptedSignals.push({ type: 'eventSignal', id });
      });
    });
  },

  validateLlmResponse(rawInput: unknown, options?: { eventIdSet?: Set<string> | null; maxFrames?: number }) {
    const audit = createValidationAudit();

    if (!isPlainObject(rawInput)) {
      const fallback = this.createFallbackResponse('NON_JSON', audit);
      return { sanitizedResponse: fallback.raw, audit: fallback.audit };
    }

    const sanitized: LlmRawInput = {};
    Object.keys(rawInput).forEach((key) => {
      if (LLM_RESPONSE_ALLOWED_KEYS.has(key)) {
        audit.acceptedKeys.push(key);
        (sanitized as Record<string, unknown>)[key] = (rawInput as Record<string, unknown>)[key];
      } else {
        audit.rejectedKeys.push(key);
      }
    });

    if (audit.rejectedKeys.length) addAuditReason(audit, 'UNKNOWN_KEYS_DROPPED');

    if (!Object.prototype.hasOwnProperty.call(sanitized, 'frames')) {
      const fallback = this.createFallbackResponse('SCHEMA_MISSING_FRAMES', audit);
      return { sanitizedResponse: fallback.raw, audit: fallback.audit };
    }

    if (sanitized.frames === null) {
      const fallback = this.createFallbackResponse('FRAMES_NULL', audit);
      return { sanitizedResponse: fallback.raw, audit: fallback.audit };
    }

    if (!Array.isArray(sanitized.frames)) {
      const fallback = this.createFallbackResponse('INVALID_TYPES', audit);
      return { sanitizedResponse: fallback.raw, audit: fallback.audit };
    }

    const normalized = this.normalizeLlmResponse(sanitized, audit, options?.maxFrames);
    if (!Array.isArray(normalized.frames) || !normalized.frames.length) {
      const fallback = this.createFallbackResponse('FRAMES_EMPTY', audit);
      return { sanitizedResponse: fallback.raw, audit: fallback.audit };
    }

    const proposalsProvided = Object.prototype.hasOwnProperty.call(normalized, 'proposals');
    if (!Array.isArray(normalized.proposals)) {
      if (proposalsProvided) addAuditReason(audit, 'INVALID_TYPES');
      addAuditReason(audit, 'PROPOSALS_DEFAULTED');
      normalized.proposals = [];
    } else {
      const filtered = (normalized.proposals as unknown[]).filter((proposal: unknown) => isPlainObject(proposal));
      if (filtered.length !== (normalized.proposals as unknown[]).length) addAuditReason(audit, 'INVALID_TYPES');
      normalized.proposals = filtered;
    }

    if (normalized.stageHints !== undefined && normalized.stageHints !== null && !isPlainObject(normalized.stageHints)) {
      addAuditReason(audit, 'INVALID_TYPES');
      normalized.stageHints = null;
    }

    this.validateLlmSignals(normalized, audit, options?.eventIdSet ?? null);

    return { sanitizedResponse: normalized, audit };
  },

  sanitizeRawResponse(rawInput: unknown, options?: { eventIdSet?: Set<string> | null; maxFrames?: number }) {
    const { sanitizedResponse, audit } = this.validateLlmResponse(rawInput, options);
    return {
      raw: sanitizedResponse,
      errors: [...audit.reasonCodes],
      droppedProposals: [] as unknown[],
      droppedStageHints: [] as unknown[],
      audit
    };
  },

  resolveRawText(raw: LlmRawInput | null | undefined): string {
    return raw?.rawText || raw?.text || '';
  },

  collectEventSignalsFromRaw(_raw: unknown): string[] { return []; },

  normalizeFrames(frames: unknown[] | undefined, limit: number, _maxText: number) {
    const frameArray = frames || [];
    return {
      frames: frameArray.slice(0, limit) as Frame[],
      trimInfo: { trimmed: frameArray.length > limit, originalCount: frameArray.length }
    };
  },

  formatEventSignal(signal: string): string { return signal; },

  buildCommitDelta(params: BuildCommitDeltaParams): CommitDeltaResult {
    const newFlags = params.result.flagsSet || [];
    const addedFlags = newFlags.filter((f: string) => !params.prevFlags.includes(f));

    const newEvents = params.result.eventsDone || [];
    const addedEvents = newEvents.filter((e: string) => !params.prevEvents.includes(e));

    const delta: CommitDeltaResult = {
        flagsSet: addedFlags.length ? addedFlags : undefined,
        completedEventsAdd: addedEvents.length ? addedEvents : undefined,
    };

    if (params.result.relationshipDelta?.length) {
        delta.relationshipDelta = params.result.relationshipDelta;
    }

    if (params.result.nextSceneId) {
        delta.stageDelta = { sceneId: params.result.nextSceneId };
    }

    if (params.result.choiceView) delta.choiceDelta = {choiceId: params.result.choiceView.choiceId, action: 'show'};

    if (params.result.endingId) {
        const ending = params.getEndingById(params.result.endingId);
        delta.endingDelta = {
            endingId: params.result.endingId,
            terminalSceneId: ending?.terminalSceneId
        };
    }

    return delta;
  },

  collectRelationshipDelta(raw: LlmRawInput | null | undefined, mode: 'talk' | 'action', playerId: string, cap: number, fallbackTargetId?: string | null): RelationshipDeltaOutput[] {
      const proposals: unknown[] = (raw as Record<string, unknown>)?.proposals as unknown[] || [];
      const deltas: RelationshipDeltaInput[] = proposals.flatMap((p: unknown) => {
        if (!isPlainObject(p)) return [];
        return ((p as Record<string, unknown>).relationshipDelta as RelationshipDeltaInput[] | undefined) || [];
      });

      const normalizeTalkRel = (delta: RelationshipDeltaInput, targetId: string): RelationshipDeltaOutput | null => {
        if (!targetId || !delta || typeof delta !== 'object') return null;
        const trackKey = typeof delta?.trackKey === 'string' ? delta.trackKey : '';
        const value = Number(delta?.delta ?? 0);
        if (!Number.isFinite(value) || value === 0 || !trackKey) return null;

        return {
          fromWho: targetId,
          toWho: playerId,
          trackKey,
          delta: this.clampDelta(value, cap),
        };
      };

      const normalizeGenericRel = (delta: RelationshipDeltaInput): RelationshipDeltaOutput | null => {
          if (!delta || typeof delta !== 'object') return null;
          const fromWho = delta?.fromWho || '';
          const toWho = delta?.toWho || playerId;
          const trackKey = typeof delta?.trackKey === 'string' ? delta.trackKey : '';
          const value = Number(delta?.delta ?? 0);
          if (!fromWho || !trackKey || value === 0) return null;

          return { fromWho, toWho, trackKey, delta: value };
      };

      if (mode === 'talk') {
        const targetId = fallbackTargetId;
        if (!targetId) return [];
        return deltas
          .map((delta) => normalizeTalkRel(delta, targetId))
          .filter((x): x is RelationshipDeltaOutput => x !== null);
      }
      return deltas
        .map((delta) => normalizeGenericRel(delta))
        .filter((x): x is RelationshipDeltaOutput => x !== null);
  }
};
