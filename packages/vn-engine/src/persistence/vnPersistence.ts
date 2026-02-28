/**
 * VN Persistence Layer (Framework-Agnostic)
 * Purpose: Handle all database operations for VN sessions, turns, commits, etc.
 * Dependencies: moyinDb (Dexie), normalize (pure functions).
 * Removed: trackDbWrite (writeCounters), IS_DEV/IS_MOCK_LLM/IS_MOCK_VN_STAGE (env).
 * shouldLog() now always returns false (enable via external configuration if needed).
 */
import { moyinDb, DB_SCHEMA_VERSION } from '../db/moyinDb';
import { normalizeRelationships } from '../state/normalize';
import type {
  CommitAudit,
  CommitDelta,
  CommitRow,
  ConversationRef,
  EndingUnlockRow,
  ModelInfo,
  ProviderMeta,
  SaveSlotRow,
  SessionRow,
  SnapshotRow,
  TurnInputPayload,
  TurnOutputPayload,
  TurnRow,
  TurnStatus,
} from '../db/types';

type CreateSessionParams = {
  storyKey: string;
  packVersion: string;
  protocolVersion: string;
  entryChapterId: string;
  entrySceneId: string;
  phase: SessionRow['phase'];
  endingId?: string | null;
  playerId?: string | null;
  targetCharId?: string | null;
};

type AppendTurnParams = {
  sessionId: string;
  turnInput: TurnInputPayload;
  turnOutput: TurnOutputPayload;
  commitDelta?: CommitDelta;
  audit?: CommitAudit;
  providerMeta?: ProviderMeta | null;
  llmRawText?: string | null;
  llmRawJson?: unknown | null;
  llmRequestJson?: unknown | null;
  modelInfo?: ModelInfo;
  llmMeta?: {
    conversationId?: string | null;
    responseId?: string | null;
    candidateId?: string | null;
    requestId?: string | null;
  };
  clientTurnKey?: string | null;
  requestId?: string | null;
  status?: TurnStatus;
  activeChapterId?: string;
  activeSceneId?: string;
  phase?: SessionRow['phase'];
  endingId?: string | null;
  targetCharId?: string | null;
  snapshot?: Omit<SnapshotRow, 'snapshotId' | 'sessionId' | 'revision' | 'commitId' | 'createdAt'>;
};

type UnlockEndingParams = {
  sessionId: string;
  storyKey: string;
  packVersion: string;
  endingId: string;
  type?: string;
  terminalSceneId?: string;
  meta?: Record<string, unknown>;
};

type SaveSlotFilter = {
  storyKey: string;
  packVersion: string;
};

type SaveGameParams = {
  sessionId: string;
  title?: string;
  preview?: SaveSlotRow['preview'];
  snapshot?: Omit<SnapshotRow, 'snapshotId' | 'sessionId' | 'revision' | 'commitId' | 'createdAt'>;
  slotId?: string;
};

type LoadGameForkResult = {
  slot: SaveSlotRow;
  snapshot: SnapshotRow;
  sessionId: string;
  forkMeta: {
    fromSlotId: string;
    fromSessionId: string;
    fromBaseRevision: number;
    fromBaseCommitId?: string | null;
  };
};

function nowIso() {
  return new Date().toISOString();
}

function shouldLog() {
  return false;
}

function createId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function safeClone<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  try {
    return structuredClone(obj);
  } catch {
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch {
      console.warn('[VNDB] safeClone failed, returning shallow copy');
      return { ...obj } as T;
    }
  }
}

function sanitizeDeltaForTalk(
  inputType: TurnInputPayload['inputType'],
  delta?: CommitDelta,
  audit?: CommitAudit,
) {
  if (!delta) return { delta, audit };
  if (inputType !== 'talk') return { delta, audit };

  const dropped: string[] = [];
  const sanitized: CommitDelta = {
    relationshipDelta: delta.relationshipDelta || [],
  };
  if (delta.flagsSet?.length) dropped.push('flagsSet');
  if (delta.completedEventsAdd?.length) dropped.push('completedEventsAdd');
  if ((delta as Record<string, unknown>).customStatsDelta) dropped.push('customStatsDelta');
  if (delta.stageDelta) dropped.push('stageDelta');
  if (delta.choiceDelta) dropped.push('choiceDelta');
  if (delta.endingDelta) dropped.push('endingDelta');

  if (dropped.length) {
    const nextAudit: CommitAudit = { ...audit };
    nextAudit.droppedEffects = [...(nextAudit.droppedEffects || []), ...dropped];
    return { delta: sanitized, audit: nextAudit };
  }

  return { delta, audit };
}

export function getConversationRef(session: SessionRow, laneKey: string): ConversationRef | null {
  if (!session.conversationLanes) return null;
  return session.conversationLanes[laneKey] ?? null;
}

export function updateConversationLane(
  session: SessionRow,
  laneKey: string,
  ref: ConversationRef,
): Record<string, ConversationRef> {
  const lanes = session.conversationLanes ?? {};
  return {
    ...lanes,
    [laneKey]: ref,
  };
}

export function migrateToDefaultLane(session: SessionRow, provider: string = 'unknown'): Record<string, ConversationRef> | undefined {
  if (session.conversationLanes && Object.keys(session.conversationLanes).length > 0) {
    return session.conversationLanes;
  }
  if (session.llmConversationId) {
    return {
      default: {
        provider,
        model: null,
        conversationId: session.llmConversationId,
        lastHandoverRevision: 0,
      },
    };
  }
  return undefined;
}

export async function createSessionFromPack(params: CreateSessionParams) {
  const sessionId = createId('sess');
  const timestamp = nowIso();
  const row: SessionRow = {
    sessionId,
    storyKey: params.storyKey,
    packVersion: params.packVersion,
    protocolVersion: params.protocolVersion,
    schemaVersion: DB_SCHEMA_VERSION,
    status: 'active',
    headCommitId: null,
    headRevision: 0,
    activeChapterId: params.entryChapterId,
    activeSceneId: params.entrySceneId,
    phase: params.phase,
    endingId: params.endingId ?? null,
    playerId: params.playerId ?? 'player',
    targetCharId: params.targetCharId ?? null,
    llmConversationId: null,
    conversationLanes: {},
    createdAt: timestamp,
    updatedAt: timestamp,
    lastPlayedAt: timestamp,
  };

  await moyinDb.sessions.put(row);
  if (shouldLog()) {
    console.info('[VNDB] session created', row);
  }
  return sessionId;
}

export async function appendTurnCommit(params: AppendTurnParams) {
  const now = nowIso();
  const status: TurnStatus = params.status || 'committed';
  const { delta, audit } = sanitizeDeltaForTalk(params.turnInput.inputType, params.commitDelta, params.audit);

  return await moyinDb.transaction('rw', moyinDb.sessions, moyinDb.turns, moyinDb.commits, moyinDb.snapshots, async () => {
    const session = await moyinDb.sessions.get(params.sessionId);
    if (!session) throw new Error(`Session not found: ${params.sessionId}`);

    const revisionFrom = session.headRevision ?? 0;
    const providerMeta: ProviderMeta | null =
      params.providerMeta ??
      (params.llmMeta
        ? {
            llmConversationId: params.llmMeta.conversationId ?? null,
            llmResponseId: params.llmMeta.responseId ?? null,
            llmCandidateId: params.llmMeta.candidateId ?? null,
            network: params.llmMeta.requestId ? { requestId: params.llmMeta.requestId } : undefined,
          }
        : null);
    const requestId = params.requestId ?? providerMeta?.network?.requestId ?? params.llmMeta?.requestId ?? null;
    const baseIdempotency =
      requestId ||
      params.clientTurnKey ||
      `${revisionFrom}:${params.turnInput.inputType}:${params.turnInput.inputText || ''}:${params.turnInput.chipId || ''}:${params.turnInput.choiceId || ''}:${params.turnInput.optionId || ''}`;
    const idempotencyKey = `${params.sessionId}:${baseIdempotency}`;
    const existingCommit = await moyinDb.commits.where('idempotencyKey').equals(idempotencyKey).first();
    if (existingCommit) {
      return { turnId: existingCommit.turnId, commitId: existingCommit.commitId, duplicated: true };
    }

    const turnId = createId('turn');
    const revisionTo = status === 'committed' ? revisionFrom + 1 : null;

    const turnRow: TurnRow = {
      turnId,
      sessionId: params.sessionId,
      requestId,
      revisionFrom,
      revisionTo,
      inputType: params.turnInput.inputType,
      inputText: params.turnInput.inputText ?? null,
      chipId: params.turnInput.chipId ?? null,
      choiceId: params.turnInput.choiceId ?? null,
      optionId: params.turnInput.optionId ?? null,
      status,
      targetCharId: params.turnInput.targetCharId ?? params.targetCharId ?? null,
      llmConversationId: providerMeta?.llmConversationId ?? params.llmMeta?.conversationId ?? null,
      llmResponseId: providerMeta?.llmResponseId ?? params.llmMeta?.responseId ?? null,
      llmCandidateId: providerMeta?.llmCandidateId ?? params.llmMeta?.candidateId ?? null,
      laneKey: (providerMeta?.laneKey as string) ?? null,
      llmRawText: params.llmRawText ?? null,
      llmRawJson: safeClone(params.llmRawJson) ?? null,
      llmRequestJson: safeClone(params.llmRequestJson) ?? null,
      providerMeta: safeClone(providerMeta) ?? null,
      frames: safeClone(params.turnOutput.frames || []),
      stageView: safeClone(params.turnOutput.stageView),
      choiceView: safeClone(params.turnOutput.choiceView) ?? null,
      endingId: params.turnOutput.endingId ?? null,
      eventSignals: params.turnOutput.eventSignals || [],
      commitId: null,
      createdAt: now,
      finishedAt: status === 'streaming' ? null : now,
    };

    let nextAudit = audit ? { ...audit } : undefined;
    let nextModelInfo = params.modelInfo ? { ...params.modelInfo } : undefined;
    if (providerMeta?.modelInfo) {
      nextModelInfo = {
        ...(nextModelInfo || {}),
        ...providerMeta.modelInfo,
      };
    }
    if (params.llmMeta) {
      nextModelInfo = {
        ...(nextModelInfo || {}),
        llmMeta: {
          conversationId: params.llmMeta.conversationId ?? null,
          responseId: params.llmMeta.responseId ?? null,
          candidateId: params.llmMeta.candidateId ?? null,
        },
      };
    }
    let sessionConversationId = session.llmConversationId ?? null;
    const nextConversationId = providerMeta?.llmConversationId ?? params.llmMeta?.conversationId ?? null;
    if (nextConversationId) {
      if (sessionConversationId && sessionConversationId !== nextConversationId) {
        const note = `conversation_id_changed:${sessionConversationId}=>${nextConversationId}`;
        nextAudit = {
          ...nextAudit,
          notes: [...(nextAudit?.notes || []), note],
        };
      }
      sessionConversationId = nextConversationId;
    }

    if (status === 'committed') {
      const commitId = createId('commit');
      const commitRow: CommitRow = {
        commitId,
        sessionId: params.sessionId,
        parentCommitId: session.headCommitId ?? null,
        revisionFrom,
        revisionTo: revisionFrom + 1,
        turnId,
        type: params.turnInput.inputType === 'system' ? 'SYSTEM_COMMIT' : 'TURN_COMMIT',
        delta: delta || {},
        audit: nextAudit,
        modelInfo: nextModelInfo,
        llmConversationId: providerMeta?.llmConversationId ?? params.llmMeta?.conversationId ?? null,
        llmResponseId: providerMeta?.llmResponseId ?? params.llmMeta?.responseId ?? null,
        llmCandidateId: providerMeta?.llmCandidateId ?? params.llmMeta?.candidateId ?? null,
        llmRawText: params.llmRawText ?? null,
        llmRawJson: params.llmRawJson ?? null,
        llmRequestJson: params.llmRequestJson ?? null,
        providerMeta: providerMeta ?? null,
        idempotencyKey,
        createdAt: now,
      };

      turnRow.commitId = commitId;
      await moyinDb.commits.add(commitRow);

      const nextLaneKey = providerMeta?.laneKey as string | undefined;
      let nextConversationLanes = session.conversationLanes;

      if (nextLaneKey && nextConversationId) {
        nextConversationLanes = updateConversationLane(session, nextLaneKey, {
          provider: nextModelInfo?.provider || 'unknown',
          model: nextModelInfo?.model || null,
          conversationId: nextConversationId,
          lastHandoverRevision: revisionFrom + 1,
        });
      }

      await moyinDb.sessions.update(params.sessionId, {
        headRevision: revisionFrom + 1,
        headCommitId: commitId,
        activeChapterId: params.activeChapterId ?? session.activeChapterId,
        activeSceneId: params.activeSceneId ?? session.activeSceneId,
        phase: params.phase ?? session.phase,
        endingId: params.endingId ?? session.endingId ?? null,
        targetCharId: params.turnInput.targetCharId ?? params.targetCharId ?? session.targetCharId ?? null,
        llmConversationId: sessionConversationId,
        conversationLanes: nextConversationLanes,
        updatedAt: now,
        lastPlayedAt: now,
      });

      if (params.snapshot) {
        const snapshotRow: SnapshotRow = {
          snapshotId: createId('snap'),
          sessionId: params.sessionId,
          revision: revisionFrom + 1,
          commitId,
          activeChapterId: params.snapshot.activeChapterId,
          activeSceneId: params.snapshot.activeSceneId,
          phase: params.snapshot.phase,
          endingId: params.snapshot.endingId ?? null,
          playerId: params.snapshot.playerId ?? null,
          llmRawText: params.snapshot.llmRawText ?? null,
          llmRawJson: params.snapshot.llmRawJson ?? null,
          providerMeta: params.snapshot.providerMeta ?? null,
          flags: params.snapshot.flags || [],
          eventsDone: params.snapshot.eventsDone || [],
          relationship: normalizeRelationships(
            params.snapshot.relationship || {},
            params.snapshot.playerId ?? 'player',
          ),
          targetCharId: params.snapshot.targetCharId ?? null,
          frames: safeClone(params.snapshot.frames || []),
          createdAt: now,
        };
        await moyinDb.snapshots.add(snapshotRow);
      }

      if (shouldLog()) {
        console.groupCollapsed('[VNDB] turn committed');
        console.log('turn', turnRow);
        console.log('commit', commitRow);
        console.groupEnd();
      }
    } else {
      await moyinDb.sessions.update(params.sessionId, {
        updatedAt: now,
        lastPlayedAt: now,
        phase: params.phase ?? session.phase,
        endingId: params.endingId ?? session.endingId ?? null,
        targetCharId: params.targetCharId ?? session.targetCharId ?? null,
        llmConversationId: sessionConversationId,
      });

      if (shouldLog()) {
        console.groupCollapsed('[VNDB] turn persisted (no commit)');
        console.log('turn', turnRow);
        console.groupEnd();
      }
    }

    await moyinDb.turns.add(turnRow);
    return { turnId: turnRow.turnId, commitId: turnRow.commitId };
  });
}

async function getSnapshotForSession(sessionId: string, revision: number) {
  if (revision == null) return null;
  return await moyinDb.snapshots
    .where('sessionId')
    .equals(sessionId)
    .and((row: SnapshotRow) => row.revision === revision)
    .first();
}

async function buildSnapshotRowFromPayload(
  sessionId: string,
  revision: number,
  commitId: string,
  payload: Omit<SnapshotRow, 'snapshotId' | 'sessionId' | 'revision' | 'commitId' | 'createdAt'>,
) {
  return {
    snapshotId: createId('snap'),
    sessionId,
    revision,
    commitId,
    createdAt: nowIso(),
    activeChapterId: payload.activeChapterId,
    activeSceneId: payload.activeSceneId,
    phase: payload.phase,
    endingId: payload.endingId ?? null,
    playerId: payload.playerId ?? null,
    llmRawText: payload.llmRawText ?? null,
    llmRawJson: payload.llmRawJson ?? null,
    providerMeta: payload.providerMeta ?? null,
    flags: payload.flags || [],
    eventsDone: payload.eventsDone || [],
    relationship: normalizeRelationships(payload.relationship || {}, payload.playerId ?? 'player'),
    targetCharId: payload.targetCharId ?? null,
    frames: payload.frames || [],
  } as SnapshotRow;
}

export async function listSaveSlots(filter: SaveSlotFilter) {
  const slots = await moyinDb.saveSlots
    .where('storyKey')
    .equals(filter.storyKey)
    .filter((slot: SaveSlotRow) => slot.packVersion === filter.packVersion)
    .sortBy('updatedAt');
  return slots.reverse();
}

export async function getSaveSlot(slotId: string) {
  return await moyinDb.saveSlots.get(slotId);
}

export async function deleteSaveSlot(slotId: string) {
  await moyinDb.saveSlots.delete(slotId);
}

export async function renameSaveSlot(slotId: string, newTitle: string) {
  const finalTitle = newTitle.trim() || `\u5B58\u6A94 ${new Date().toISOString()}`;
  await moyinDb.saveSlots.update(slotId, { title: finalTitle, updatedAt: nowIso() });
}

export async function getSessionById(sessionId: string) {
  return await moyinDb.sessions.get(sessionId);
}

export async function listSnapshotsBySessionId(sessionId: string) {
  return await moyinDb.snapshots.where('sessionId').equals(sessionId).sortBy('revision');
}

export async function saveGame(params: SaveGameParams) {
  const session = await moyinDb.sessions.get(params.sessionId);
  if (!session) throw new Error(`Session not found: ${params.sessionId}`);
  const baseRevision = session.headRevision ?? 0;
  const baseCommitId = session.headCommitId ?? null;
  if (!baseCommitId) throw new Error('Cannot save before first commit');

  let snapshotRow = await getSnapshotForSession(params.sessionId, baseRevision);
  if (!snapshotRow && params.snapshot) {
    const row = await buildSnapshotRowFromPayload(
      params.sessionId,
      baseRevision,
      baseCommitId,
      params.snapshot,
    );
    await moyinDb.snapshots.add(row);
    snapshotRow = row;
  }
  if (!snapshotRow) {
    throw new Error('Snapshot not found for current revision');
  }

  const slotId = params.slotId ?? createId('slot');
  const title =
    params.title && params.title.trim().length ? params.title.trim() : `\u5B58\u6A94 ${new Date().toISOString()}`;
  const row: SaveSlotRow = {
    slotId,
    storyKey: session.storyKey,
    packVersion: session.packVersion,
    sessionId: params.sessionId,
    snapshotId: snapshotRow.snapshotId,
    baseCommitId,
    baseRevision,
    title,
    preview: params.preview ?? null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  await moyinDb.saveSlots.put(row);
  return row;
}

export async function loadGameFork(slotId: string, packPayload: unknown): Promise<LoadGameForkResult> {
  const slot = await moyinDb.saveSlots.get(slotId);
  if (!slot) throw new Error(`Save slot not found: ${slotId}`);
  const snapshot = await moyinDb.snapshots.get(slot.snapshotId);
  if (!snapshot) throw new Error(`Snapshot not found: ${slot.snapshotId}`);

  const pack = packPayload as Record<string, unknown> | null;
  const packOpening = (pack?.opening as Record<string, unknown>) ?? {};
  const packChapters = (pack?.chapters as Array<Record<string, unknown>>) ?? [];
  const packManifest = (pack?.manifest as Record<string, unknown>) ?? {};

  const entrySceneId =
    snapshot.activeSceneId ||
    (packOpening.initialSceneId as string) ||
    (packChapters[0]?.entrySceneId as string) ||
    '';
  const chapter =
    packChapters.find((c) => ((c.sceneIds as string[]) || []).includes(entrySceneId)) ||
    packChapters[0];
  const entryChapterId = (chapter?.chapterId as string) || (packChapters[0]?.chapterId as string) || '';
  const protocolVersion = String(
    packManifest.protocolVersionPin ?? packManifest.schemaVersion ?? '1',
  );

  const restoredPhase = snapshot.phase || (snapshot.endingId ? 'ended' : 'await_input');

  const newSessionId = await createSessionFromPack({
    storyKey: slot.storyKey,
    packVersion: slot.packVersion,
    protocolVersion,
    entryChapterId,
    entrySceneId: entrySceneId || entryChapterId,
    phase: restoredPhase,
    playerId: snapshot.playerId ?? 'player',
    targetCharId: snapshot.targetCharId ?? null,
  });
  const newSnapshot = await buildSnapshotRowFromPayload(
    newSessionId,
    0,
    slot.baseCommitId ?? createId('commit'),
    {
      activeChapterId: snapshot.activeChapterId,
      activeSceneId: snapshot.activeSceneId,
      phase: restoredPhase,
      endingId: snapshot.endingId ?? null,
      playerId: snapshot.playerId ?? null,
      llmRawText: snapshot.llmRawText ?? null,
      llmRawJson: snapshot.llmRawJson ?? null,
      providerMeta: snapshot.providerMeta ?? null,
      flags: snapshot.flags,
      eventsDone: snapshot.eventsDone,
      relationship: snapshot.relationship,
      targetCharId: snapshot.targetCharId ?? null,
      frames: safeClone(snapshot.frames || []),
    },
  );
  await moyinDb.snapshots.add(newSnapshot);
  await moyinDb.saveSlots.update(slotId, { updatedAt: nowIso() });

  return {
    sessionId: newSessionId,
    slot,
    snapshot: newSnapshot,
    forkMeta: {
      fromSlotId: slot.slotId,
      fromSessionId: slot.sessionId,
      fromBaseRevision: slot.baseRevision,
      fromBaseCommitId: slot.baseCommitId ?? null,
    },
  };
}

export async function unlockEndingIfNeeded(params: UnlockEndingParams) {
  const unlockId = `${params.storyKey}@${params.packVersion}:${params.endingId}`;
  const existing = await moyinDb.endingUnlocks.get(unlockId);
  if (existing) return unlockId;

  const row: EndingUnlockRow = {
    unlockId,
    storyKey: params.storyKey,
    packVersion: params.packVersion,
    endingId: params.endingId,
    type: params.type,
    terminalSceneId: params.terminalSceneId,
    unlockedAt: nowIso(),
    bySessionId: params.sessionId,
    meta: params.meta,
  };

  await moyinDb.endingUnlocks.put(row);
  if (shouldLog()) {
    console.info('[VNDB] ending unlocked', row);
  }
  return unlockId;
}

export async function getLatestSessionByStoryKey(storyKey: string) {
  const sessions = await moyinDb.sessions.where('storyKey').equals(storyKey).toArray();
  const activeSessions = sessions.filter((session: SessionRow) => session.status === 'active');
  if (!activeSessions.length) return null;
  activeSessions.sort((a: SessionRow, b: SessionRow) => (a.updatedAt > b.updatedAt ? 1 : -1));
  return activeSessions[activeSessions.length - 1] || null;
}

export async function getTurnsBySessionId(sessionId: string) {
  return await moyinDb.turns.where('sessionId').equals(sessionId).sortBy('revisionFrom');
}

export async function getCommitsBySessionId(sessionId: string) {
  return await moyinDb.commits.where('sessionId').equals(sessionId).sortBy('revisionTo');
}

export async function getFramesByCommitId(commitId: string) {
  const commit = await moyinDb.commits.get(commitId);
  if (!commit || !commit.turnId) return [];
  const turn = await moyinDb.turns.get(commit.turnId);
  return turn?.frames || [];
}
