/**
 * VN Execution Engine (Framework-Agnostic)
 * Purpose: Handle all types of Turn submissions and state projections.
 * All .value accessors removed - state properties are accessed directly.
 * i18n dependency removed - locale is injectable via options.
 */
import type { VnRuntimeState } from './VnState';
import { RuntimeResult, ok, rejected, failed, VnErrorCode } from './runtimeResult';
import { VnContext } from './VnContext';
import { VnHelper } from './VnHelper';
import { VnEvents } from './VnEvents';
import {
  TALK_RELATIONSHIP_CAP,
  DEFAULT_MAX_FRAMES,
  MAX_FRAME_TEXT
} from './constants';
import type { LlmTurnRequest, ProviderMeta } from '../providers/llm/types';
import type { MemoryServicePort } from '../memory/memory-port';
import { formatMemoryContextPayload, formatSharedMemoryContext, createStableId } from '../memory/memory-utils';
import { isErr } from '../utils/result';
import type { Frame, StageView, TurnResult } from '../providers/types';
import type {
  TurnInputPayload,
  TurnOutputPayload,
  CommitDelta,
  CommitAudit,
  SnapshotRow
} from '../db/types';

// ========================================
// VnEngineOptions dependency type definitions
// ========================================

export type SceneConfig = {
  sceneId?: string;
  chapterId?: string;
  activeCast?: string[];
  assetsWhitelist?: string[];
  choicePoints?: Array<{
    choiceId?: string;
    options?: Array<{
      optionId?: string;
      text?: string;
      targetSceneId?: string;
      sideEffects?: Record<string, unknown>;
    }>;
  }>;
  events?: Array<{ eventId?: string; [key: string]: unknown }>;
  [key: string]: unknown;
};

export type ChapterConfig = {
  chapterId: string;
  title?: string;
  entrySceneId?: string;
  sceneIds?: string[];
  [key: string]: unknown;
};

export type EndingConfig = {
  endingId: string;
  terminalSceneId?: string;
  type?: string;
  [key: string]: unknown;
};

export interface LlmProviderInterface {
  generateTurn(request: LlmTurnRequest): Promise<{
    raw: unknown;
    providerMeta?: ProviderMeta;
  }>;
}

export type PersistTurnParams = {
  input: TurnInputPayload;
  output: TurnOutputPayload;
  commitDelta?: CommitDelta;
  audit?: CommitAudit;
  providerMeta?: ProviderMeta | null;
  llmRawText?: string | null;
  llmRawJson?: unknown | null;
  llmRequestJson?: unknown | null;
  frameTrimInfo?: { trimmed: boolean; originalCount: number };
  rawValidationErrors?: string[];
  llmMeta?: Record<string, unknown>;
  snapshot?: Partial<SnapshotRow>;
  clientTurnKey: string;
  status?: 'success' | 'failed';
};

export type TraceEventType =
  | 'NEXT'
  | 'OPEN_BACKLOG'
  | 'CLOSE_BACKLOG'
  | 'OPEN_COMMAND'
  | 'CLOSE_COMMAND'
  | 'OPEN_SAVELOAD'
  | 'CLOSE_SAVELOAD'
  | 'REPLAY_BLOCKED'
  | 'TURN_INPUT'
  | 'SUBMIT_TALK'
  | 'SUBMIT_ACTION'
  | 'CHOOSE_OPTION'
  | 'SCENE_ENTER'
  | 'PHASE_CHANGE'
  | 'COMMIT'
  | 'SNAPSHOT'
  | 'DEPRECATION'
  | 'LLM_RAW_VALIDATION'
  | 'LLM_RAW_TRIM'
  | 'ERROR'
  | 'DEMO_STEP'
  | 'REPLAY_STEP'
  | 'LANE_SWITCH'
  | 'MEMORY_ERROR'
  | 'MEMORY_CONTEXT_FAILED'
  | 'MEMORY_APPEND_FAILED'
  | 'MEMORY_FACT_FAILED'
  | 'MEMORY_SUMMARY_FAILED'
  | 'LLM_RETRY'
  | 'LLM_FALLBACK';

export type TraceEventParams = {
  type: TraceEventType;
  payload: Record<string, unknown>;
};

export type ProviderErrorParams = {
  type?: string;
  message?: string;
  name?: string;
  audit?: Record<string, unknown>;
};

export type SceneEntryResult = {
  frames: Frame[];
  stageView?: StageView;
  endingId?: string | null;
};

export type VnEngineOptions = {
  llmProvider: LlmProviderInterface;
  getSceneById: (id: string) => SceneConfig | undefined;
  getChapterById: (id: string) => ChapterConfig | undefined;
  getEndingById: (id: string) => EndingConfig | undefined;
  getEndingIdByScene: (sceneId: string) => string | null;
  persistTurn: (params: PersistTurnParams) => Promise<void>;
  pushTraceEvent: (params: TraceEventParams) => void;
  nextClientTurnKey: (type: string, extra?: string) => string;
  updateLaneKey: (scene: SceneConfig | undefined, targetId: string) => void;
  applyProviderMeta: (meta: ProviderMeta | null) => Record<string, unknown>;
  buildTurnOutput: (result: TurnResult, eventSignals: string[]) => TurnOutputPayload;
  handleProviderError: (err: ProviderErrorParams) => void;
  applyResult: (result: TurnResult) => void;
  buildSceneEntry: (sceneId: string, flags: Set<string>, events: Set<string>) => SceneEntryResult;
  buildStageView?: (scene: SceneConfig | undefined, hints?: Record<string, unknown>) => StageView;
  memoryService?: MemoryServicePort;
  /** Locale string provider (replaces i18n.getLocale()) */
  getLocale?: () => string;
};

export class VnExecutionEngine {
  constructor(
    private state: VnRuntimeState,
    private options: VnEngineOptions
  ) {}

  async submitTalk(text: string): Promise<RuntimeResult> {
    const { state, options } = this;
    const scene = options.getSceneById(state.activeSceneId);

    VnContext.syncFocusAndTarget(state, scene);
    const resolvedTarget = state.targetCharId;
    if (!resolvedTarget) {
      return rejected('NO_ACTIVE_SCENE', VnErrorCode.PHASE_MISMATCH, { phase: state.phase, method: 'submitTalk' });
    }

    options.pushTraceEvent({
      type: 'SUBMIT_TALK',
      payload: { length: text.length, targetCharId: resolvedTarget }
    });

    const clientTurnKey = options.nextClientTurnKey('talk');
    state.phase = 'busy';
    const prevFlags = [...state.flagsSet];
    const prevEvents = [...state.eventsDone];

    try {
      const llmContext = await this.callLlmForTurn({
        scene,
        inputType: 'talk',
        text,
        targetCharId: resolvedTarget
      });

      const turnResult = this.processTurnResult({
        llmContext,
        scene,
        inputType: 'talk',
        targetCharId: resolvedTarget,
        allowSideEffects: false
      });

      options.applyResult(turnResult.result);

      await options.persistTurn({
        input: { inputType: 'talk', inputText: text, targetCharId: resolvedTarget },
        output: options.buildTurnOutput(turnResult.result, turnResult.eventSignals.map(VnHelper.formatEventSignal)),
        commitDelta: VnHelper.buildCommitDelta({
          inputType: 'talk',
          prevFlags,
          prevEvents,
          result: turnResult.result,
          getEndingById: options.getEndingById
        }),
        audit: turnResult.completion.audit,
        providerMeta: turnResult.providerMetaWithRuntime,
        llmRawText: llmContext.rawText,
        llmRawJson: (llmContext.raw as Record<string, unknown>).rawJson ?? null,
        llmRequestJson: llmContext.requestSnapshot,
        frameTrimInfo: turnResult.trimInfo,
        rawValidationErrors: llmContext.errors,
        llmMeta: turnResult.llmMeta,
        snapshot: VnContext.buildSnapshotPayload(state, {
          llmRawText: llmContext.rawText,
          llmRawJson: (llmContext.raw as Record<string, unknown>).rawJson,
          providerMeta: turnResult.providerMetaWithRuntime,
          frames: turnResult.result.frames
        }),
        clientTurnKey
      });

      await this.recordMemoryFromTalk({
        targetCharId: resolvedTarget,
        playerText: text,
        frames: (turnResult.result.frames || []) as Frame[]
      });

      return ok();
    } catch (err: unknown) {
      return await this.handleTurnError(err, {
        inputType: 'talk',
        inputText: text,
        targetCharId: resolvedTarget,
        clientTurnKey
      });
    }
  }

  async submitAction(chipId: string): Promise<RuntimeResult> {
    const { state, options } = this;
    const scene = options.getSceneById(state.activeSceneId);

    VnContext.syncFocusAndTarget(state, scene);
    const resolvedTarget = state.targetCharId;

    options.pushTraceEvent({ type: 'SUBMIT_ACTION', payload: { chipId, targetCharId: resolvedTarget } });

    const clientTurnKey = options.nextClientTurnKey('action', chipId);
    state.phase = 'busy';
    const prevFlags = [...state.flagsSet];
    const prevEvents = [...state.eventsDone];

    try {
      const llmContext = await this.callLlmForTurn({
        scene,
        inputType: 'action',
        chipId,
        targetCharId: resolvedTarget
      });

      const turnResult = this.processTurnResult({
        llmContext,
        scene,
        inputType: 'action',
        chipId,
        targetCharId: resolvedTarget,
        allowSideEffects: true
      });

      options.applyResult(turnResult.result);

      await options.persistTurn({
        input: { inputType: 'action', chipId, targetCharId: resolvedTarget },
        output: options.buildTurnOutput(turnResult.result, turnResult.eventSignals.map(VnHelper.formatEventSignal)),
        commitDelta: VnHelper.buildCommitDelta({
          inputType: 'action',
          prevFlags,
          prevEvents,
          result: turnResult.result,
          getEndingById: options.getEndingById
        }),
        audit: turnResult.completion.audit,
        providerMeta: turnResult.providerMetaWithRuntime,
        llmRawText: llmContext.rawText,
        llmRawJson: (llmContext.raw as Record<string, unknown>).rawJson ?? null,
        llmRequestJson: llmContext.requestSnapshot,
        frameTrimInfo: turnResult.trimInfo,
        rawValidationErrors: llmContext.errors,
        llmMeta: turnResult.llmMeta,
        snapshot: VnContext.buildSnapshotPayload(state, {
          llmRawText: llmContext.rawText,
          llmRawJson: (llmContext.raw as Record<string, unknown>).rawJson,
          providerMeta: turnResult.providerMetaWithRuntime,
          frames: turnResult.result.frames
        }),
        clientTurnKey
      });
      return ok();
    } catch (err: unknown) {
      return await this.handleTurnError(err, {
        inputType: 'action',
        chipId,
        targetCharId: resolvedTarget,
        clientTurnKey
      });
    }
  }

  private async callLlmForTurn(params: {
    scene: SceneConfig | undefined;
    inputType: 'talk' | 'action';
    text?: string;
    chipId?: string;
    targetCharId: string | null;
  }) {
    const { state, options } = this;
    const { scene, inputType, text, chipId, targetCharId } = params;

    options.updateLaneKey(scene, targetCharId || '');

    const activeCast = VnContext.getActiveCastForProvider(state, scene);
    const memoryContext = await this.resolveMemoryContext({
      inputType,
      text,
      chipId,
      targetCharId,
      activeCastIds: activeCast
    });

    const llmRequestPayload: LlmTurnRequest = {
      turnIndex: state.clientTurnSeq,
      sceneId: state.activeSceneId,
      chapterId: state.activeChapterId,
      inputType,
      text,
      chipId,
      targetCharId: targetCharId ?? undefined,
      playerId: state.playerId,
      activeCast,
      castMeta: activeCast.reduce((acc, id) => {
        acc[id] = { displayName: state.charactersById[id]?.displayName || id };
        return acc;
      }, {} as Record<string, { displayName: string }>),
      assetsWhitelist: scene?.assetsWhitelist,
      relationship: state.relationship as Record<string, {value: number}>,
      sessionId: state.sessionId,
      llmConversationId: state.llmConversationId,
      laneKey: state.currentLaneKey,
      locale: options.getLocale?.() || 'en',
      memoryContext: memoryContext || undefined,
    };

    const requestSnapshot = VnHelper.buildLlmRequestSnapshot(llmRequestPayload);

    const packGame = (state.packPayload as Record<string, unknown> | null)?.game as Record<string, unknown> | undefined;
    const packLimits = packGame?.limits as Record<string, unknown> | undefined;
    const maxFrames = Math.min(
      DEFAULT_MAX_FRAMES,
      Number(packLimits?.maxFramesPerTurn ?? DEFAULT_MAX_FRAMES)
    );
    const maxAttempts = 2;
    let lastError: unknown = null;
    let attemptsMade = 0;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      attemptsMade = attempt;
      try {
        const llmResult = await options.llmProvider.generateTurn(llmRequestPayload);

        const { raw: rawInput, providerMeta } = VnHelper.normalizeProviderResult(llmResult);

        const { raw, errors, droppedProposals, droppedStageHints, audit } = VnHelper.sanitizeRawResponse(rawInput, {
          eventIdSet: state.eventIdSet,
          maxFrames
        });

        const providerMetaWithAudit = { ...(providerMeta || {}), validationAudit: audit };

        if (errors.length || audit.fallbackUsed || audit.reasonCodes.length) {
          options.pushTraceEvent({
            type: 'LLM_RAW_VALIDATION',
            payload: { errors, droppedProposals, droppedStageHints, audit }
          });
        }

        if (audit.fallbackUsed) {
          options.handleProviderError({ type: 'llm_fallback', audit });
        }

        const rawText = VnHelper.resolveRawText(raw);

        return {
          raw,
          rawText,
          providerMeta: providerMetaWithAudit,
          errors,
          requestSnapshot
        };
      } catch (err: unknown) {
        lastError = err;
        if (attempt < maxAttempts) {
          options.pushTraceEvent({
            type: 'ERROR',
            payload: { stage: 'LLM_RETRY', attempt, error: this.summarizeError(err) }
          });
          continue;
        }
      }
    }

    const timeoutDetected = this.isTimeoutError(lastError);
    const retried = attemptsMade > 1;
    let fallbackReason = 'RETRY_EXHAUSTED';
    if (timeoutDetected) fallbackReason = retried ? 'TIMEOUT_AFTER_RETRY' : 'TIMEOUT';
    const fallback = VnHelper.createFallbackResponse(fallbackReason);

    options.pushTraceEvent({
      type: 'ERROR',
      payload: {
        stage: 'LLM_FALLBACK',
        reason: fallbackReason,
        error: this.summarizeError(lastError),
        audit: fallback.audit
      }
    });
    options.handleProviderError({ type: 'llm_fallback', audit: fallback.audit });

    return {
      raw: fallback.raw,
      rawText: VnHelper.resolveRawText(fallback.raw),
      providerMeta: { validationAudit: fallback.audit },
      errors: [...fallback.audit.reasonCodes],
      requestSnapshot
    };
  }

  private processTurnResult(params: {
    llmContext: { raw: Record<string, unknown>; rawText: string; providerMeta: ProviderMeta | null; errors: string[]; requestSnapshot: unknown };
    scene: SceneConfig | undefined;
    inputType: 'talk' | 'action';
    chipId?: string;
    targetCharId: string | null;
    allowSideEffects: boolean;
  }) {
    const { state, options } = this;
    const { llmContext, scene, inputType, chipId, targetCharId, allowSideEffects } = params;
    const { raw, providerMeta } = llmContext;

    const llmMeta = options.applyProviderMeta(providerMeta);

    const flags = new Set<string>(state.flagsSet);
    const events = new Set<string>(state.eventsDone);

    if (allowSideEffects) {
      VnEvents.applySideEffectsFromChoice(state, null, flags, events);
    }

    const eventSignals = VnHelper.collectEventSignalsFromRaw(raw);

    const completion = VnEvents.resolveEventCompletions(state, {
      scene,
      chapterId: state.activeChapterId,
      inputType,
      chipId,
      eventSignals,
      flags: flags as Set<string>,
      eventsDone: events as Set<string>,
      allowEffects: allowSideEffects,
      eventIdSet: state.eventIdSet
    });

    const stageHints = typeof raw.stageHints === 'object' && raw.stageHints !== null
      ? raw.stageHints as Record<string, unknown>
      : undefined;
    const stageView = options.buildStageView
      ? options.buildStageView(scene, stageHints)
      : VnContext.buildStageView(state, scene, stageHints);

    const nextTurnCount = state.turnCountWithinScene + 1;

    const allowImmediate = nextTurnCount > 0;

    let choiceView = VnContext.resolveChoiceView(
      scene,
      flags as Set<string>,
      { enforceConditions: true, allowImmediate }
    );

    const endingId = options.getEndingIdByScene(state.activeSceneId);
    if (endingId) choiceView = null;

    const packGameProc = (state.packPayload as Record<string, unknown> | null)?.game as Record<string, unknown> | undefined;
    const packLimitsProc = packGameProc?.limits as Record<string, unknown> | undefined;
    const frameLimit = Number(packLimitsProc?.maxFramesPerTurn ?? DEFAULT_MAX_FRAMES);

    const { frames, trimInfo } = VnHelper.normalizeFrames(raw.frames as unknown[] || [], frameLimit, MAX_FRAME_TEXT);

    const providerMetaWithRuntime = {
      ...(providerMeta || {}),
      runtime: {
        ...((providerMeta as Record<string, unknown>)?.runtime as Record<string, unknown>),
        framesTrimmed: trimInfo.trimmed,
        originalCount: trimInfo.originalCount,
      },
    };

    const result: TurnResult = {
      frames,
      stageView,
      choiceView: choiceView || undefined,
      endingId: endingId || undefined,
      nextSceneId: state.activeSceneId,
      flagsSet: Array.from(flags),
      eventsDone: Array.from(events),
      relationshipDelta: VnHelper.collectRelationshipDelta(
        raw,
        inputType,
        state.playerId || 'player',
        TALK_RELATIONSHIP_CAP,
        targetCharId
      ),
      turnCountWithinScene: nextTurnCount,
    };

    return {
      result,
      completion,
      eventSignals,
      trimInfo,
      providerMetaWithRuntime,
      llmMeta
    };
  }

  private async resolveMemoryContext(params: {
    inputType: 'talk' | 'action';
    text?: string;
    chipId?: string;
    targetCharId: string | null;
    activeCastIds?: string[];
  }): Promise<string | null> {
    const memoryService = this.options.memoryService;
    if (!memoryService || !params.targetCharId) return null;

    const query = params.text || params.chipId || '';
    if (!query) return null;

    const memoryResult = await memoryService.buildMemoryContext(params.targetCharId, query);
    if (isErr(memoryResult)) {
      const memoryError = memoryResult.error;
      this.options.pushTraceEvent({
        type: 'MEMORY_CONTEXT_FAILED',
        payload: {
          code: memoryError.code,
          message: memoryError.message
        }
      });
      return null;
    }
    const payloads: string[] = [];
    const basePayload = formatMemoryContextPayload(memoryResult.value);
    if (basePayload) payloads.push(basePayload);

    if (params.activeCastIds && params.activeCastIds.length > 1) {
      const sharedResult = await memoryService.retrieveSharedMemories(params.activeCastIds, query);
      if (isErr(sharedResult)) {
        const memoryError = sharedResult.error;
        this.options.pushTraceEvent({
          type: 'MEMORY_CONTEXT_FAILED',
          payload: {
            code: memoryError.code,
            message: memoryError.message,
            scope: 'shared'
          }
        });
      } else {
        const sharedPayload = formatSharedMemoryContext(sharedResult.value);
        if (sharedPayload) payloads.push(sharedPayload);
      }
    }

    const payload = payloads.join('\n\n').trim();
    return payload || null;
  }

  private async recordMemoryFromTalk(params: {
    targetCharId: string | null;
    playerText: string;
    frames: Frame[];
  }): Promise<void> {
    const memoryService = this.options.memoryService;
    if (!memoryService || !params.targetCharId) return;

    const userResult = await memoryService.appendTurn(params.targetCharId, {
      role: 'user',
      content: params.playerText
    });
    if (isErr(userResult)) {
      const userError = userResult.error;
      this.options.pushTraceEvent({
        type: 'MEMORY_APPEND_FAILED',
        payload: {
          code: userError.code,
          message: userError.message,
          role: 'user'
        }
      });
    }

    const assistantText = params.frames
      .map((frame) => (frame.speaker ? `${frame.speaker}\uFF1A${frame.text}` : frame.text))
      .join('\n')
      .trim();

    if (!assistantText) return;

    const assistantResult = await memoryService.appendTurn(params.targetCharId, {
      role: 'assistant',
      content: assistantText
    });
    if (isErr(assistantResult)) {
      const assistantError = assistantResult.error;
      this.options.pushTraceEvent({
        type: 'MEMORY_APPEND_FAILED',
        payload: {
          code: assistantError.code,
          message: assistantError.message,
          role: 'assistant'
        }
      });
    }
  }

  private async recordMemoryFromChoice(params: {
    targetCharId: string | null;
    choiceId: string;
    optionId: string;
    choiceText?: string;
  }): Promise<void> {
    const memoryService = this.options.memoryService;
    if (!memoryService || !params.targetCharId || !params.choiceText) return;

    const turnId = createStableId('choice', [
      this.state.sessionId,
      params.choiceId,
      params.optionId
    ]);

    const factResult = await memoryService.extractFacts(
      params.targetCharId,
      turnId,
      params.choiceText
    );
    if (isErr(factResult)) {
      const factError = factResult.error;
      this.options.pushTraceEvent({
        type: 'MEMORY_FACT_FAILED',
        payload: {
          code: factError.code,
          message: factError.message
        }
      });
    }
  }

  private async triggerSummaryForScene(sceneId: string): Promise<void> {
    const memoryService = this.options.memoryService;
    if (!memoryService) return;
    const scene = this.options.getSceneById(sceneId);
    const cast = VnContext.getActiveCastForProvider(this.state, scene);
    for (const characterId of cast) {
      const summaryResult = await memoryService.triggerSummary(characterId);
      if (isErr(summaryResult)) {
        const summaryError = summaryResult.error;
        this.options.pushTraceEvent({
          type: 'MEMORY_SUMMARY_FAILED',
          payload: {
            code: summaryError.code,
            message: summaryError.message,
            ownerId: characterId
          }
        });
      }
    }
  }

  private async handleTurnError(err: unknown, params: {
    inputType: 'talk' | 'action';
    inputText?: string;
    chipId?: string;
    targetCharId: string | null;
    clientTurnKey: string;
  }) {
    const { state, options } = this;
    const safeError = this.sanitizeProviderError(err);

    options.handleProviderError(safeError);

    await options.persistTurn({
      input: {
        inputType: params.inputType,
        inputText: params.inputText,
        chipId: params.chipId,
        targetCharId: params.targetCharId
      },
      output: {
        frames: [],
        stageView: state.stageView,
        choiceView: state.choiceView ?? undefined,
        endingId: state.endingId ?? undefined
      },
      status: 'failed',
      clientTurnKey: params.clientTurnKey
    });

    return failed('LLM_REQUEST_FAILED', VnErrorCode.RUNTIME_BUSY, safeError);
  }

  private isTimeoutError(err: unknown) {
    if (!err) return false;
    const name = (err as Record<string, unknown>)?.name;
    if (typeof name === 'string' && name.toLowerCase().includes('abort')) return true;
    const message = this.summarizeError(err).toLowerCase();
    return message.includes('timeout') || message.includes('timed out');
  }

  private summarizeError(err: unknown) {
    if (!err) return '';
    if (err instanceof Error) return err.message || err.name;
    if (typeof err === 'string') return err;
    try {
      return JSON.stringify(err);
    } catch {
      return String(err);
    }
  }

  private sanitizeProviderError(err: unknown) {
    const name = (err as Record<string, unknown>)?.name;
    return {
      message: 'LLM_REQUEST_FAILED',
      name: typeof name === 'string' ? name : 'Error'
    };
  }

  async handleChoose(choiceId: string, optionId: string): Promise<RuntimeResult> {
    const { state, options } = this;
    if (!state.choiceView) {
      return rejected('NO_CHOICE_VIEW', VnErrorCode.PHASE_MISMATCH, { phase: state.phase, method: 'choose' });
    }

    const scene = options.getSceneById(state.activeSceneId);
    const choicePoint = (scene?.choicePoints || []).find((c) => c.choiceId === choiceId);
    const option = (choicePoint?.options || []).find((o) => o.optionId === optionId);
    const targetSceneId = option?.targetSceneId || state.activeSceneId;
    const previousSceneId = state.activeSceneId;
    const previousChapterId = state.activeChapterId;
    const sceneChanged = targetSceneId !== previousSceneId;

    const clientTurnKey = options.nextClientTurnKey('choice', `${choiceId}:${optionId}`);
    state.phase = 'busy';

    const flags = new Set<string>(state.flagsSet);
    const events = new Set<string>(state.eventsDone);

    const completion = VnEvents.resolveEventCompletions(state, {
      scene,
      chapterId: state.activeChapterId,
      inputType: 'choice',
      choiceId,
      optionId,
      flags: flags as Set<string>,
      eventsDone: events as Set<string>,
      allowEffects: true,
      eventIdSet: state.eventIdSet
    });

    const sideEffects = option?.sideEffects ?? null;
    VnEvents.applySideEffectsFromChoice(state, sideEffects, flags, events);

    const nextSceneId = targetSceneId;
    let stage = state.stageView;
    let frames: Frame[] = [];
    let endingId: string | null = null;

    if (sceneChanged) {
      state.activeSceneId = targetSceneId;
      const nextScene = options.getSceneById(targetSceneId);
      stage = options.buildStageView
        ? options.buildStageView(nextScene)
        : VnContext.buildStageView(state, nextScene);

      const entry = options.buildSceneEntry(targetSceneId, flags, events);
      frames = entry.frames || [];
      stage = entry.stageView || stage;
      endingId = entry.endingId ?? null;

      const nextChapter = options.getChapterById(nextScene?.chapterId || state.activeChapterId);
      if (nextChapter) state.activeChapterId = nextChapter.chapterId;
      state.turnCountWithinScene = 0;
    } else {
      endingId = options.getEndingIdByScene(targetSceneId);
    }

    const result: TurnResult = {
      frames,
      stageView: stage,
      choiceView: undefined,
      endingId: endingId || undefined,
      nextSceneId,
      flagsSet: Array.from(flags),
      eventsDone: Array.from(events),
      turnCountWithinScene: state.turnCountWithinScene
    };

    const commitDelta = VnHelper.buildCommitDelta({
      inputType: 'choice',
      prevFlags: [...state.flagsSet],
      prevEvents: [...state.eventsDone],
      result,
      getEndingById: options.getEndingById
    });

    options.applyResult(result);

    await options.persistTurn({
      input: { inputType: 'choice', choiceId, optionId },
      output: options.buildTurnOutput(result, []),
      commitDelta,
      audit: completion.audit,
      snapshot: VnContext.buildSnapshotPayload(state, { frames }),
      clientTurnKey
    });

    await this.recordMemoryFromChoice({
      targetCharId: state.targetCharId,
      choiceId,
      optionId,
      choiceText: option?.text
    });

    if (sceneChanged || previousChapterId !== state.activeChapterId) {
      await this.triggerSummaryForScene(state.activeSceneId);
    }

    return ok();
  }
}
