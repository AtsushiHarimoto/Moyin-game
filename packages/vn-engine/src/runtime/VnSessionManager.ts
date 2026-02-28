/**
 * VN Session Manager (Framework-Agnostic)
 * Purpose: Manage VN sessions (Session) and save slots (Save Slot) lifecycle.
 * All .value accessors removed - state properties are accessed directly.
 * setTraceContext removed - tracing is handled externally via options callbacks.
 */
import type { VnRuntimeState, PartialSessionMeta } from './VnState';
import { VnContext } from './VnContext';
import { VnEvents } from './VnEvents';
import { normalizeRelationships } from '../state/normalize';
import {
  createSessionFromPack,
  deleteSaveSlot,
  getSessionById,
  getCommitsBySessionId,
  getLatestSessionByStoryKey,
  getTurnsBySessionId,
  loadGameFork,
  listSnapshotsBySessionId,
  listSaveSlots,
  saveGame,
  getFramesByCommitId,
  renameSaveSlot
} from '../persistence/vnPersistence';
import type {
  SaveSlotRow,
  SessionRow,
  SnapshotRow,
  TurnRow,
  CommitRow,
  TurnInputPayload,
  TurnOutputPayload,
  CommitDelta,
  CommitAudit
} from '../db/types';
import type { StageView, TurnResult } from '../providers/types';
import { DEFAULT_PLAYER_ID } from './constants';

import type { VnBacklogManager } from './VnBacklogManager';

type ChoiceOptionLike = { optionId?: string; targetSceneId?: string };

type ChoicePointLike = { choiceId?: string; options?: ChoiceOptionLike[] };

type SceneLike = {
  sceneId?: string;
  chapterId?: string;
  events?: Array<{ eventId?: string; [key: string]: unknown }>;
  choicePoints?: ChoicePointLike[];
  [key: string]: unknown;
};

type StoryPackLike = {
  manifest?: {
    storyKey?: string;
    packVersion?: string;
    protocolVersionPin?: string | number;
    schemaVersion?: string | number;
  };
  opening?: { initialSceneId?: string };
  chapters?: Array<{
    chapterId?: string;
    entrySceneId?: string;
    sceneIds?: string[];
  }>;
  scenes?: SceneLike[];
  endings?: Array<{ endingId?: string; terminalSceneId?: string }>;
  characters?: Array<{ charId?: string; displayName?: string; [key: string]: unknown }>;
  assets?: { items?: Array<{ assetKey?: string; [key: string]: unknown }>; baseUrl?: string };
  assetByKey?: Record<string, { assetKey?: string; [key: string]: unknown }>;
  assetsBaseUrl?: string;
  assetAudioMetaByKey?: Record<string, unknown>;
  game?: {
    player?: { playerId?: string; excludeFromActiveCastUI?: boolean; displayName?: string };
    limits?: { maxFramesPerTurn?: number };
  };
};

type ReplayStep = { turn: TurnRow; commit: CommitRow | null };

type ScriptStep =
  | { type: 'action'; chipId: string }
  | { type: 'choice'; optionId: string };

export interface VnSessionOptions {
  backlogManager: VnBacklogManager;
  getSceneById: (id: string) => SceneLike | undefined;
  applyResult: (result: TurnResult) => void;
  buildSceneEntry: (sceneId: string, flags: Set<string>, events: Set<string>) => TurnResult;
  persistTurn: (params: {
    input: TurnInputPayload;
    output: TurnOutputPayload;
    commitDelta?: CommitDelta;
    audit?: CommitAudit;
    clientTurnKey: string;
    status?: 'success' | 'failed';
    snapshot?: Omit<SnapshotRow, 'snapshotId' | 'sessionId' | 'revision' | 'commitId' | 'createdAt'>;
  }) => Promise<void>;
  nextClientTurnKey: (type: string, extra?: string) => string;
  buildTurnOutput: (result: TurnResult, signals: string[]) => TurnOutputPayload;
  buildCommitDelta: (params: {
    inputType: 'talk' | 'action' | 'choice' | 'system';
    prevFlags: string[];
    prevEvents: string[];
    result: TurnResult;
  }) => CommitDelta;
  handleNotification?: (msg: string) => void;
  warnDeprecation: (code: string, payload?: unknown) => void;
  buildStageView?: (scene: SceneLike | undefined) => StageView;
  /** Optional tracing callback (replaces setTraceContext) */
  setTraceContext?: (ctx: Record<string, unknown>) => void;
}

export class VnSessionManager {
  constructor(
    private state: VnRuntimeState,
    private options: VnSessionOptions
  ) {}

  async reset() {
    const state = this.state;

    state.events.removeAllListeners();
    state.phase = 'ended';
    state.frameQueue = [];
    state.playheadIndex = -1;
    state.isTyping = false;
    state.stageView = { bgUrl: '', portraits: [], bgmUrl: '' };
    state.choiceView = null;
    state.endingId = null;
    state.sessionId = null;
    state.activeSceneId = '';
    state.activeChapterId = '';
    state.flagsSet = new Set();
    state.eventsDone = new Set();

    state.relationship = {};

    this.options.backlogManager.populateFromTurns([]);
    state.saveSlots = [];
    state.replaySteps = [];
    state.replayIndex = 0;
    state.mode = 'new';
  }

  async startSessionFromPack(pack: StoryPackLike) {
    await this.reset();
    const state = this.state;
    state.packPayload = pack;
    this.syncPackResources(pack);
    state.scriptMap = this.generateScriptsFromPack(pack);

    const entrySceneId = pack?.opening?.initialSceneId || pack?.chapters?.[0]?.entrySceneId;
    if (!entrySceneId) throw new Error('No entry scene found');

    state.activeSceneId = entrySceneId;
    const chapter = pack?.chapters?.find(c => (c.sceneIds || []).includes(entrySceneId));
    state.activeChapterId = chapter?.chapterId || 'chapter_1';

    const sessionMeta: PartialSessionMeta = {
      storyKey: pack.manifest?.storyKey || 'default',
      packVersion: pack.manifest?.packVersion || '1.0.0',
      protocolVersion: '1',
    };
    state.sessionMeta = sessionMeta;

    const sessionId = await createSessionFromPack({
      storyKey: sessionMeta.storyKey,
      packVersion: sessionMeta.packVersion,
      entrySceneId,
      entryChapterId: state.activeChapterId,
      playerId: state.playerId,
      phase: 'playing',
      protocolVersion: sessionMeta.protocolVersion,
    });

    state.sessionId = sessionId;

    const entry = this.options.buildSceneEntry(entrySceneId, new Set(), new Set());
    const res = await VnEvents.applySceneEnter(state, entrySceneId, new Set(), new Set(), this.options.getSceneById);

    const combinedFrames = [...(entry.frames || [])];
    const result: TurnResult = {
      ...entry,
      frames: combinedFrames,
      flagsSet: Array.from(res.flags),
      eventsDone: Array.from(res.eventsDone),
    };

    this.options.applyResult(result);
    state.phase = combinedFrames.length ? 'playing' : 'await_input';

    await this.options.persistTurn({
      input: { inputType: 'system', inputText: 'Game Start', targetCharId: null },
      output: this.options.buildTurnOutput(result, []),
      commitDelta: this.options.buildCommitDelta({ inputType: 'system', prevFlags: [], prevEvents: [], result }),
      clientTurnKey: this.options.nextClientTurnKey('system', 'start'),
      snapshot: {
        ...VnContext.buildSnapshotPayload(state),
        frames: combinedFrames
      }
    });
  }

  async restoreSessionFromPack(packPayloadArg: StoryPackLike, targetSessionId?: string): Promise<boolean> {
    const state = this.state;
    const epoch = (state.loadEpoch || 0) + 1;
    state.loadEpoch = epoch;
    state.isHydrating = true;

    try {
      await this.reset();
      state.packPayload = packPayloadArg;
      state.sessionMeta = {
        storyKey: packPayloadArg?.manifest?.storyKey || 'mock-story',
        packVersion: packPayloadArg?.manifest?.packVersion || '1.0.0',
        protocolVersion: String(
          packPayloadArg?.manifest?.protocolVersionPin ?? packPayloadArg?.manifest?.schemaVersion ?? '1',
        ),
      } as PartialSessionMeta;

      this.syncPackResources(packPayloadArg);
      state.scriptMap = this.generateScriptsFromPack(packPayloadArg);

      let session: SessionRow | undefined | null = null;
      if (targetSessionId) {
        session = await getSessionById(targetSessionId);
      } else {
        session = await getLatestSessionByStoryKey(state.sessionMeta!.storyKey!);
      }

      if (!session) return false;

      state.sessionId = session.sessionId;
      state.llmConversationId = session.llmConversationId ?? null;
      state.activeChapterId = session.activeChapterId;
      state.activeSceneId = session.activeSceneId;
      state.endingId = session.endingId ?? null;
      if (session.playerId) state.playerId = session.playerId;
      state.targetCharId = session.targetCharId ?? null;

      this.options.setTraceContext?.({
        sessionId: state.sessionId!,
        llmConversationId: state.llmConversationId,
      });

      const snapshots = await listSnapshotsBySessionId(session.sessionId);
      const headSnapshot = snapshots.sort((a: SnapshotRow, b: SnapshotRow) => b.revision - a.revision)[0];

      if (headSnapshot) {
        await this.applyLoadedSnapshot(session.sessionId, headSnapshot, {
          storyKey: state.sessionMeta!.storyKey,
          packVersion: state.sessionMeta!.packVersion,
          title: 'Auto Restore'
        } as SaveSlotRow);
      } else {
        const firstScene = this.options.getSceneById(state.activeSceneId);
        if (firstScene) {
          const entry = this.options.buildSceneEntry(state.activeSceneId, new Set(), new Set());
          this.options.applyResult(entry);
        }
      }
      return true;
    } finally {
      state.isHydrating = false;
    }
  }

  async saveSlot(title?: string) {
    const state = this.state;
    if (!state.sessionId) throw new Error('No active session to save');
    if (!state.packPayload) throw new Error('Pack is not loaded');

    const currentFrame = state.frameQueue[state.playheadIndex] ?? null;

    const params = {
      sessionId: state.sessionId,
      title: title?.trim() || undefined,
      snapshot: {
        ...VnContext.buildSnapshotPayload(state),
        frames: JSON.parse(JSON.stringify(state.frameQueue))
      },
      preview: {
        sceneId: state.activeSceneId,
        speakerName: currentFrame?.speaker || '\u65C1\u767D',
        textSnippet: currentFrame?.text || (state.endingId ? '\u5DF2\u9054\u6210\u7D50\u5C40' : '...'),
        endingId: state.endingId || undefined,
        coverAssetKey: state.stageView?.bgKey
      }
    };

    const result = await saveGame(params);
    await this.refreshSaveSlots();
    return result;
  }

  async loadSlot(slotId: string) {
    const state = this.state;
    if (!state.packPayload) throw new Error('Pack is not loaded');

    const epoch = (state.loadEpoch || 0) + 1;
    state.loadEpoch = epoch;
    state.isHydrating = true;
    console.debug(`[SessionManager] Start Hydration Epoch ${epoch} (LoadSlot: ${slotId})`);

    try {
      const result = await loadGameFork(slotId, state.packPayload);
      await this.applyLoadedSnapshot(result.sessionId, result.snapshot, result.slot);
      await this.refreshSaveSlots();
      return result;
    } finally {
      state.isHydrating = false;
      console.debug(`[SessionManager] End Hydration Epoch ${epoch}`);
    }
  }

  async deleteSlot(slotId: string) {
    await deleteSaveSlot(slotId);
    await this.refreshSaveSlots();
  }

  async renameSlot(slotId: string, newTitle: string) {
    await renameSaveSlot(slotId, newTitle);
    await this.refreshSaveSlots();
  }

  async refreshSaveSlots() {
    const state = this.state;
    if (!state.sessionMeta?.storyKey) return;
    state.saveSlots = await listSaveSlots({
      storyKey: state.sessionMeta.storyKey,
      packVersion: state.sessionMeta.packVersion,
    });
  }

  async applyLoadedSnapshot(newSessionId: string, snapshot: SnapshotRow, slot: SaveSlotRow) {
    const state = this.state;
    const pack = state.packPayload;
    if (!pack) throw new Error('Pack is not loaded');

    await this.reset();

    await this.restoreBacklogFromSession(newSessionId, snapshot.revision);
    this.restoreSessionMeta(newSessionId, snapshot, slot, pack);
    this.restoreSceneAndChapterState(snapshot, pack);
    this.restoreGameState(snapshot);
    await this.restoreUIState(snapshot, newSessionId);
    await this.restoreFrameQueue(snapshot);

    if (slot?.title) {
      this.options.backlogManager.addSystemMessage(`\u5DF2\u8B80\u6A94\uFF1A${slot.title}`, `slot-${slot.slotId}`);
    }

    this.options.setTraceContext?.({
      sessionId: newSessionId,
      storyKey: slot.storyKey,
      packVersion: slot.packVersion,
    });
  }

  private async restoreBacklogFromSession(sessionId: string, revision: number) {
    try {
      const turns = await getTurnsBySessionId(sessionId);
      this.options.backlogManager.populateFromTurns(turns, revision);
    } catch (err) {
      console.warn('[SessionManager] Failed to restore backlog:', err);
    }
  }

  private restoreSessionMeta(sessionId: string, snapshot: SnapshotRow, slot: SaveSlotRow, pack: StoryPackLike) {
    const state = this.state;
    state.packPayload = pack;
    state.sessionId = sessionId;
    state.sessionMeta = {
      storyKey: slot.storyKey ?? pack.manifest?.storyKey ?? '',
      packVersion: slot.packVersion ?? pack.manifest?.packVersion ?? '',
      protocolVersion: String(
        pack.manifest?.protocolVersionPin ?? pack.manifest?.schemaVersion ?? '1',
      ),
    } as PartialSessionMeta;

    this.syncPackResources(pack);
    state.scriptMap = this.generateScriptsFromPack(pack);
  }

  private restoreSceneAndChapterState(snapshot: SnapshotRow, pack: StoryPackLike) {
    const state = this.state;
    state.activeSceneId = snapshot.activeSceneId || '';

    const chapter = pack.chapters?.find((c) => (c.sceneIds || []).includes(state.activeSceneId)) || pack.chapters?.[0];
    state.activeChapterId = chapter?.chapterId || snapshot.activeChapterId || '';
  }

  private restoreGameState(snapshot: SnapshotRow) {
    const state = this.state;
    state.flagsSet = new Set(snapshot.flags || []);
    state.eventsDone = new Set(snapshot.eventsDone || []);

    const restoredRelationships: Record<string, { value: number }> = {};
    const normalizedRelationships = normalizeRelationships(
      snapshot.relationship || {},
      state.playerId ?? undefined
    );
    Object.entries(normalizedRelationships).forEach(([charId, relationshipValue]) => {
      restoredRelationships[charId] = { value: Number(relationshipValue || 0) };
    });
    state.relationship = restoredRelationships;
  }

  private async restoreUIState(snapshot: SnapshotRow, sessionId: string) {
    const state = this.state;
    const scene = this.options.getSceneById(state.activeSceneId);

    state.stageView = this.options.buildStageView
      ? this.options.buildStageView(scene)
      : VnContext.buildStageView(state, scene);

    state.frameQueue = [];
    state.playheadIndex = 0;
    state.isTyping = false;
    state.choiceView = null;
    state.endingId = snapshot.endingId ?? null;
    if (snapshot.playerId) state.playerId = snapshot.playerId;
    state.targetCharId = snapshot.targetCharId ?? null;

    VnContext.syncFocusAndTarget(state, scene);

    state.clientTurnSeq = await this.calcMaxTurnSeq(sessionId);

    if (snapshot.phase) {
      state.phase = snapshot.phase;
    } else {
      state.phase = snapshot.endingId ? 'ended' : 'await_input';
    }

    if (state.phase === 'await_choice') {
      const choice = VnContext.resolveChoiceView(
        scene,
        state.flagsSet,
        { enforceConditions: true, allowImmediate: true }
      );
      if (choice) {
        state.choiceView = choice;
      } else {
        console.warn('[SessionManager] Failed to restore choiceView in await_choice phase, fallback to await_input');
        state.phase = 'await_input';
      }
    }
  }

  private async restoreFrameQueue(snapshot: SnapshotRow) {
    const state = this.state;
    if (snapshot.frames && snapshot.frames.length > 0) {
      state.frameQueue = snapshot.frames;
      state.playheadIndex = snapshot.frames.length - 1;
      return;
    }

    if (snapshot.commitId) {
      try {
        const frames = await getFramesByCommitId(snapshot.commitId);
        if (frames && frames.length > 0) {
          state.frameQueue = frames;
          state.playheadIndex = frames.length - 1;
        }
      } catch (e) {
        console.warn('[SessionManager] Legacy frame fetch failed:', e);
      }
    }
  }

  syncPackResources(pack: StoryPackLike) {
    this.syncAssets(pack);
    this.syncPlayerInfo(pack);
    this.syncCharacters(pack);
    this.syncEvents(pack);
  }

  private syncAssets(pack: StoryPackLike) {
    const state = this.state;
    const normalizedAssets = pack?.assetByKey;
    if (normalizedAssets && typeof normalizedAssets === 'object') {
      state.assetsByKey = normalizedAssets;
    } else {
      const assetMap: Record<string, { assetKey?: string; [key: string]: unknown }> = {};
      (pack?.assets?.items || []).forEach(asset => {
        if (asset?.assetKey) {
          assetMap[asset.assetKey] = asset;
        }
      });
      state.assetsByKey = assetMap;
    }

    state.assetsBaseUrl = pack?.assetsBaseUrl || pack?.assets?.baseUrl || '';
    state.assetAudioMetaByKey = pack?.assetAudioMetaByKey || {};
  }

  private syncPlayerInfo(pack: StoryPackLike) {
    const state = this.state;
    const playerBlock = pack?.game?.player || {};

    const resolvedPlayerId = typeof playerBlock?.playerId === 'string'
      ? playerBlock.playerId
      : DEFAULT_PLAYER_ID;

    if (!playerBlock?.playerId) {
      this.options.warnDeprecation('game.player.missing', { fallback: resolvedPlayerId });
    }

    state.playerId = resolvedPlayerId;
    state.excludePlayerFromActiveCastUI = playerBlock?.excludeFromActiveCastUI !== false;
    state.playerDisplayName = playerBlock?.displayName || '';
  }

  private syncCharacters(pack: StoryPackLike) {
    const state = this.state;
    const characterMap: Record<string, { displayName?: string; [key: string]: unknown }> = {};

    (pack?.characters || []).forEach(character => {
      if (!character?.charId) return;

      characterMap[character.charId] = character;

      if (character.charId !== state.playerId && !state.relationship[character.charId]) {
        state.relationship[character.charId] = { value: 0 };
      }
    });

    state.charactersById = characterMap;

    if (!state.playerDisplayName && state.playerId) {
      state.playerDisplayName = characterMap[state.playerId]?.displayName || '\u73A9\u5BB6';
    }
  }

  private syncEvents(pack: StoryPackLike) {
    const state = this.state;
    const eventIdSet = new Set<string>();
    const eventMap: Record<string, { eventId?: string; [key: string]: unknown }> = {};

    (pack?.scenes || []).forEach(scene => {
      (scene?.events || []).forEach(event => {
        if (!event?.eventId) return;

        eventIdSet.add(event.eventId);
        eventMap[event.eventId] = event;
      });
    });

    state.eventIdSet = eventIdSet;
    state.eventById = eventMap;
  }

  async startReplayFromSession(packPayloadArg: StoryPackLike, targetSessionId: string, targetRevision?: number) {
    const state = this.state;
    const session = await getSessionById(targetSessionId);
    if (!session) throw new Error(`Replay session not found: ${targetSessionId}`);

    state.isHydrating = true;

    try {
      state.sessionId = session.sessionId;
      state.llmConversationId = session.llmConversationId ?? null;

      state.packPayload = packPayloadArg;

      state.sessionMeta = {
        storyKey: session.storyKey || packPayloadArg?.manifest?.storyKey || 'unknown',
        packVersion: session.packVersion || packPayloadArg?.manifest?.packVersion || '1.0.0',
        protocolVersion: String(
          packPayloadArg?.manifest?.protocolVersionPin ?? packPayloadArg?.manifest?.schemaVersion ?? '1'
        ),
      } as PartialSessionMeta;

      this.options.setTraceContext?.({
        sessionId: session.sessionId,
        llmConversationId: state.llmConversationId,
      });

      const [snapshots, commits, turns] = await Promise.all([
        listSnapshotsBySessionId(session.sessionId),
        getCommitsBySessionId(session.sessionId),
        getTurnsBySessionId(session.sessionId),
      ]);
      const revisionLimit = targetRevision ?? session.headRevision ?? 0;
      const baseSnapshot =
        [...snapshots]
          .filter(row => row.revision <= revisionLimit)
          .sort((a, b) => b.revision - a.revision)[0] || null;

      if (baseSnapshot) {
        await this.applyLoadedSnapshot(session.sessionId, baseSnapshot, {
          storyKey: state.sessionMeta!.storyKey,
          packVersion: state.sessionMeta!.packVersion,
          title: 'Replay Restore'
        } as SaveSlotRow);
      } else {
        state.activeChapterId = session.activeChapterId;
        state.activeSceneId = session.activeSceneId;
        state.phase = session.phase;
        state.endingId = session.endingId ?? null;
        if (session.playerId) state.playerId = session.playerId;
        state.targetCharId = session.targetCharId ?? null;
      }

      const baseRevision = baseSnapshot?.revision ?? 0;

      this.options.backlogManager.populateFromTurns(turns, revisionLimit);

      VnContext.syncFocusAndTarget(state, this.options.getSceneById(state.activeSceneId));

      state.replaySteps = this.buildReplaySteps(commits, turns, baseRevision, revisionLimit);
      state.replayIndex = 0;
      state.replayEndMessageShown = false;
      state.mode = 'replay';

      state.endingId = null;
    } finally {
      state.isHydrating = false;
    }
  }

  private generateScriptsFromPack(pack: StoryPackLike): Record<string, ScriptStep[]> {
    const sceneIndex: Record<string, SceneLike> = {};
    (pack?.scenes || []).forEach(scene => {
      if (scene?.sceneId) {
        sceneIndex[scene.sceneId] = scene;
      }
    });

    const endingByTerminalScene: Record<string, string> = {};
    (pack?.endings || []).forEach(ending => {
      if (ending?.terminalSceneId && ending?.endingId) {
        endingByTerminalScene[ending.terminalSceneId] = ending.endingId;
      }
    });

    const entrySceneId = pack?.opening?.initialSceneId
      || pack?.chapters?.[0]?.entrySceneId
      || pack?.chapters?.[0]?.sceneIds?.[0];

    const scriptsByEnding: Record<string, ScriptStep[]> = {};

    const traverseSceneGraph = (currentSceneId: string, currentPath: ScriptStep[]) => {
      const endingId = endingByTerminalScene[currentSceneId];
      if (endingId) {
        scriptsByEnding[endingId] = currentPath.slice();
        return;
      }

      const scene = sceneIndex[currentSceneId];
      if (!scene) return;

      const choicePoint = scene.choicePoints?.[0];
      if (!choicePoint) return;

      for (const option of choicePoint.options || []) {
        if (!option?.optionId || !option?.targetSceneId) continue;

        const nextPath = currentPath.slice();
        nextPath.push({ type: 'action', chipId: 'auto' });
        nextPath.push({ type: 'choice', optionId: option.optionId });

        traverseSceneGraph(option.targetSceneId, nextPath);
      }
    };

    if (entrySceneId) {
      traverseSceneGraph(entrySceneId, []);
    }

    return scriptsByEnding;
  }

  private buildReplaySteps(commits: CommitRow[], turns: TurnRow[], baseRevision: number, limitRevision: number) {
    const commitByTurnId = new Map<string, CommitRow>();
    commits.forEach(commit => {
      commitByTurnId.set(commit.turnId, commit);
    });

    const steps: ReplayStep[] = [];
    turns.forEach(turn => {
      const turnRevision = turn.revisionTo ?? 0;

      if (turnRevision > 0 && turnRevision <= limitRevision) {
        steps.push({
          turn,
          commit: commitByTurnId.get(turn.turnId) || null,
        });
      }
    });

    return steps.sort((a, b) => (a.turn.revisionTo ?? 0) - (b.turn.revisionTo ?? 0));
  }

  private async calcMaxTurnSeq(sessionId: string): Promise<number> {
    const [turns, commits] = await Promise.all([
      getTurnsBySessionId(sessionId),
      getCommitsBySessionId(sessionId),
    ]);

    const maxTurnRevision = turns.reduce((max: number, turn: TurnRow) => {
      const turnMaxRevision = Math.max(turn.revisionTo ?? 0, turn.revisionFrom ?? 0);
      return turnMaxRevision > max ? turnMaxRevision : max;
    }, 0);

    const maxCommitRevision = commits.reduce((max: number, commit: CommitRow) => {
      const commitMaxRevision = Math.max(commit.revisionTo ?? 0, commit.revisionFrom ?? 0);
      return commitMaxRevision > max ? commitMaxRevision : max;
    }, 0);

    const maxByCount = turns.length;

    return Math.max(maxTurnRevision, maxCommitRevision, maxByCount);
  }
}
