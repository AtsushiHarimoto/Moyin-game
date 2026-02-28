/**
 * VN Runtime State (Framework-Agnostic)
 * Purpose: Define all runtime state as plain properties with EventEmitter for change notification.
 * Replaces Vue 3 ref/reactive/computed/shallowRef.
 */
import { EventEmitter } from '../utils/EventEmitter';
import type { ChoiceView, Frame, StageView } from '../providers/types';
import type { CommitRow, TurnRow, SaveSlotRow, Phase, SessionRow } from '../db/types';

/**
 * Partial session metadata used during session initialization before full SessionRow is available.
 */
export type PartialSessionMeta = Pick<SessionRow, 'storyKey' | 'packVersion' | 'protocolVersion'> & Partial<SessionRow>;

/**
 * Replay step type: a turn with its associated commit.
 */
export type ReplayStep = {
  turn: TurnRow;
  commit: CommitRow | null;
};

/**
 * Backlog item representing a single entry in the conversation history.
 */
export type BacklogItem = {
  id: string;
  type: 'dialogue' | 'system' | 'choice' | 'narration';
  speaker?: string;
  text: string;
  turnId?: string;
  timestamp?: string;
};

/**
 * Character state stored in the runtime charactersById map.
 */
export type CharacterState = {
  charId?: string;
  displayName?: string;
  assets?: {
    avatar?: string;
    portraits?: Record<string, string>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

/**
 * Asset entry stored in the runtime assetsByKey map.
 */
export type AssetEntry = {
  assetKey?: string;
  url?: string;
  path?: string;
  type?: string;
  [key: string]: unknown;
};

/**
 * VnRuntimeState: plain object holding all VN runtime state.
 * All properties are directly accessible (no .value needed).
 * Use the `events` EventEmitter to subscribe to state changes.
 */
export type VnRuntimeState = {
  // Event emitter for state change notifications
  events: EventEmitter;

  // Session / Story
  sessionId: string | null;
  storyKey: string | null;
  sessionMeta: SessionRow | PartialSessionMeta | null;
  packPayload: unknown;

  // Phase & Mode
  phase: Phase;
  mode: 'new' | 'resume' | 'replay';

  // Scene & Chapter
  activeChapterId: string;
  activeSceneId: string;
  endingId: string | null;

  // Player & Target
  playerId: string | null;
  targetCharId: string | null;
  playerDisplayName: string;
  excludePlayerFromActiveCastUI: boolean;

  // Frame Playback
  frameQueue: Frame[];
  playheadIndex: number;
  isTyping: boolean;

  // Stage View
  stageView: StageView;
  choiceView: ChoiceView | null;

  // Game Progress
  relationship: Record<string, number | Record<string, number> | { value: number }>;
  flagsSet: Set<string>;
  eventsDone: Set<string>;
  turnCountWithinScene: number;
  clientTurnSeq: number;

  // LLM Conversation
  llmConversationId: string | null;
  currentLaneKey: string | null;

  // Hydration Guards
  isHydrating: boolean;
  loadEpoch: number;

  // Characters & Assets
  charactersById: Record<string, CharacterState>;
  assetsByKey: Record<string, AssetEntry>;
  assetsBaseUrl: string;
  assetAudioMetaByKey: Record<string, unknown>;
  scriptMap: Record<string, unknown>;

  // Backlog & Events
  backlogItems: BacklogItem[];
  eventIdSet: Set<string>;
  eventById: Record<string, { eventId?: string; [key: string]: unknown }>;

  // Save Slots
  saveSlots: SaveSlotRow[];

  // Replay
  replaySteps: ReplayStep[];
  replayIndex: number;
  replayEndMessageShown: boolean;
};

/**
 * Computed accessor: get current frame from frameQueue by playheadIndex.
 */
export function getCurrentFrame(state: VnRuntimeState): Frame | null {
  if (state.playheadIndex >= 0 && state.playheadIndex < state.frameQueue.length) {
    return state.frameQueue[state.playheadIndex] ?? null;
  }
  return null;
}

/**
 * Create a fresh VnRuntimeState with default values.
 * Replaces Vue's createVnState() / useVnRuntimeState().
 */
export function createVnState(): VnRuntimeState {
  return {
    events: new EventEmitter(),

    sessionId: null,
    storyKey: null,
    sessionMeta: null,
    packPayload: null,

    phase: 'playing',
    mode: 'new',

    activeChapterId: '',
    activeSceneId: '',
    endingId: null,

    playerId: null,
    targetCharId: null,
    playerDisplayName: '',
    excludePlayerFromActiveCastUI: false,

    frameQueue: [],
    playheadIndex: -1,
    isTyping: false,

    stageView: { bgUrl: '', portraits: [], bgmUrl: '' },
    choiceView: null,

    relationship: {},
    flagsSet: new Set(),
    eventsDone: new Set(),
    turnCountWithinScene: 0,
    clientTurnSeq: 0,

    llmConversationId: null,
    currentLaneKey: null,

    isHydrating: false,
    loadEpoch: 0,

    charactersById: {},
    assetsByKey: {},
    assetsBaseUrl: '',
    assetAudioMetaByKey: {},
    scriptMap: {},

    backlogItems: [],
    eventIdSet: new Set(),
    eventById: {},

    saveSlots: [],

    replaySteps: [],
    replayIndex: -1,
    replayEndMessageShown: false,
  };
}
