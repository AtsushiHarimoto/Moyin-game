/**
 * Visual novel domain types.
 *
 * Covers: story pack JSON schema, scenes, characters, assets,
 * dialogue frames, choices, stage views, turn processing,
 * and flow-graph node data.
 */

// ---------------------------------------------------------------------------
// Story pack JSON structures (shared between import & runtime)
// ---------------------------------------------------------------------------

/** Top-level story pack JSON structure. */
export interface StoryPackJson {
  manifest?: {
    storyKey: string;
    title: string;
    version: string;
    author?: string;
  };
  characters?: CharacterJson[];
  scenes?: SceneJson[];
  assets?: {
    /** New format: baseUrl + items array. */
    baseUrl?: string;
    items?: AssetItemJson[];
    /** Legacy format fields. */
    backgrounds?: AssetJson[];
    bgm?: AssetJson[];
    se?: AssetJson[];
  };
  /** Legacy root-level compat fields. */
  storyKey?: string;
  title?: string;
  version?: string;
  [key: string]: unknown;
}

/** Asset item in the new `assets.items` format. */
export interface AssetItemJson {
  assetKey: string;
  type: 'portrait' | 'bg' | 'bgm' | 'sfx';
  url: string;
  meta?: Record<string, unknown>;
}

/** Character definition inside a story pack JSON. */
export interface CharacterJson {
  /** New format fields. */
  charId?: string;
  displayName?: string;
  persona?: string;
  assets?: {
    avatar?: string;
    portraits?: Record<string, string>;
  };
  /** Legacy format compat fields. */
  id?: string;
  name?: string;
  sprites?: Array<{ url?: string }>;
  [key: string]: unknown;
}

/** Scene definition inside a story pack JSON. */
export interface SceneJson {
  id: string;
  name?: string;
  background?: string;
  dialogues?: unknown[];
  [key: string]: unknown;
}

/** Legacy asset reference. */
export interface AssetJson {
  id: string;
  name?: string;
  url?: string;
}

// ---------------------------------------------------------------------------
// Entry sentinel
// ---------------------------------------------------------------------------

/** Marks the entry point of a scene or chapter. */
export const ENTRY_SENTINEL = '__enter__';

// ---------------------------------------------------------------------------
// Game phase
// ---------------------------------------------------------------------------

/**
 * Current execution phase of the VN engine.
 *
 * - `idle`         -- session exists but not started
 * - `playing`      -- dialogue is being displayed
 * - `await_input`  -- waiting for user text or action
 * - `await_choice` -- waiting for user to pick a branch
 * - `busy`         -- processing (e.g. LLM call in flight)
 * - `ended`        -- game has reached an ending
 */
export type Phase =
  | 'idle'
  | 'playing'
  | 'await_input'
  | 'await_choice'
  | 'busy'
  | 'ended';

// ---------------------------------------------------------------------------
// Stage view
// ---------------------------------------------------------------------------

/** Portrait placement on the stage. */
export type PortraitView = {
  /** Character identifier. */
  id: string;
  /** Pose key defined in the story pack. */
  poseKey?: string;
  /** Resolved URL of the pose image. */
  poseUrl?: string;
  /** Stage position. */
  position?: 'left' | 'center' | 'right';
};

/** Visual state of the stage (background, portraits, audio). */
export type StageView = {
  bgKey?: string;
  bgUrl?: string;
  portraits?: PortraitView[];
  bgmKey?: string;
  bgmUrl?: string;
  sfxKey?: string;
};

// ---------------------------------------------------------------------------
// Dialogue frame
// ---------------------------------------------------------------------------

/** A single dialogue or narration frame. */
export type Frame = {
  /** Unique frame identifier. */
  id: string;
  /** Speaker name (omitted for narration). */
  speaker?: string;
  /** Dialogue text content. */
  text: string;
  /** Whether the player can advance to the next frame. */
  canNext?: boolean;
};

// ---------------------------------------------------------------------------
// Choice system
// ---------------------------------------------------------------------------

/** A single branching option. */
export type ChoiceOption = {
  optionId: string;
  text: string;
  targetSceneId: string;
};

/** A choice point with its available options. */
export type ChoiceView = {
  choiceId: string;
  options: ChoiceOption[];
};

// ---------------------------------------------------------------------------
// Turn processing
// ---------------------------------------------------------------------------

/**
 * Full context required to execute a turn.
 *
 * Carries scene state, session metadata, flags, events,
 * relationships, and player identity.
 */
export type TurnContext = {
  activeSceneId: string;
  activeChapterId: string;
  sessionMeta: {
    storyKey: string;
    packVersion: string;
    protocolVersion: string;
  };
  packPayload?: unknown;
  flagsSet?: string[];
  eventsDone?: string[];
  turnCountWithinScene?: number;
  relationship?: Record<string, { value: number }>;
  playerId?: string | null;
  targetCharId?: string | null;
};

/**
 * User input for a turn (discriminated union).
 *
 * - `talk`   -- free-text dialogue
 * - `action` -- predefined action chip
 * - `choice` -- branch selection
 */
export type TurnInput =
  | { inputType: 'talk'; text: string; targetCharId?: string | null }
  | { inputType: 'action'; chipId: string; targetCharId?: string | null }
  | { inputType: 'choice'; optionId: string };

/** Relationship change produced by a turn. */
export type RelationshipDelta = {
  fromWho: string;
  toWho: string;
  trackKey: string;
  delta: number;
  note?: string;
  reason?: string;
};

/**
 * Complete output of a turn execution.
 *
 * Contains generated frames, stage updates, branching,
 * state mutations, and optional ending.
 */
export type TurnResult = {
  frames: Frame[];
  stageView?: StageView;
  choiceView?: ChoiceView | null;
  endingId?: string | null;
  nextSceneId?: string;
  nextChapterId?: string;
  flagsSet?: string[];
  eventsDone?: string[];
  turnCountWithinScene?: number;
  relationshipDelta?: RelationshipDelta[];
};

/** Payload describing what the user submitted for a turn. */
export type TurnInputPayload = {
  inputType: 'talk' | 'action' | 'choice' | 'system';
  inputText?: string | null;
  chipId?: string | null;
  choiceId?: string | null;
  optionId?: string | null;
  targetCharId?: string | null;
};

/** Payload describing engine output for a turn. */
export type TurnOutputPayload = {
  frames: Frame[];
  stageView?: StageView;
  choiceView?: ChoiceView | null;
  endingId?: string | null;
  eventSignals?: string[];
};

// ---------------------------------------------------------------------------
// Turn provider interface (framework-agnostic)
// ---------------------------------------------------------------------------

/** Strategy interface for AI turn processing. */
export interface TurnProvider {
  submitTurn(ctx: TurnContext, input: TurnInput): Promise<TurnResult>;
}

// ---------------------------------------------------------------------------
// VN mode (UI state enum, framework-agnostic)
// ---------------------------------------------------------------------------

/**
 * UI mode of the visual novel player.
 *
 * - `vn`      -- normal gameplay
 * - `backlog` -- reviewing history
 * - `menu`    -- game menu open
 * - `input`   -- text/action input panel open
 */
export type VnMode = 'vn' | 'backlog' | 'menu' | 'input';

// ---------------------------------------------------------------------------
// Flow-graph node types (used by story editors)
// ---------------------------------------------------------------------------

export const NODE_TYPES = {
  STORY_PACK: 'story-pack',
  CHARACTER: 'character',
  SCENE: 'scene',
  ASSET_GROUP: 'asset-group',
} as const;

export type NodeType = (typeof NODE_TYPES)[keyof typeof NODE_TYPES];

export const EDGE_TYPES = {
  NEON: 'neon',
} as const;

export type EdgeType = (typeof EDGE_TYPES)[keyof typeof EDGE_TYPES];

/** Node types that support editing. */
export const EDITABLE_NODE_TYPES: readonly NodeType[] = [
  NODE_TYPES.STORY_PACK,
  NODE_TYPES.CHARACTER,
  NODE_TYPES.SCENE,
] as const;

// ---------------------------------------------------------------------------
// Flow-graph node data
// ---------------------------------------------------------------------------

export interface StoryPackNodeData {
  type: 'story-pack';
  title: string;
  storyKey: string;
  version: string;
  author?: string;
  coverImage?: string;
}

export interface CharacterNodeData {
  type: 'character';
  id: string;
  name: string;
  originalId?: string;
  portrait?: string;
  expressionCount: number;
  poseCount: number;
}

export interface SceneNodeData {
  type: 'scene';
  id: string;
  name: string;
  originalId?: string;
  background?: string;
  dialogueCount: number;
  branchCount: number;
}

export interface ExtendedSceneNodeData extends SceneNodeData {
  dialogue?: string;
  characterName?: string;
  characterPortrait?: string;
}

export interface AssetGroupNodeData {
  type: 'asset-group';
  category: 'backgrounds' | 'bgm' | 'se';
  items: AssetItem[];
  count: number;
}

export interface AssetItem {
  id: string;
  name: string;
  thumbnail?: string;
}

export type FlowNodeData =
  | StoryPackNodeData
  | CharacterNodeData
  | ExtendedSceneNodeData
  | AssetGroupNodeData;

// ---------------------------------------------------------------------------
// Flow-graph edge
// ---------------------------------------------------------------------------

export interface StoryFlowEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  path?: string;
}

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isStoryPackData(data: FlowNodeData): data is StoryPackNodeData {
  return data.type === 'story-pack';
}

export function isCharacterData(data: FlowNodeData): data is CharacterNodeData {
  return data.type === 'character';
}

export function isSceneData(data: FlowNodeData): data is ExtendedSceneNodeData {
  return data.type === 'scene';
}

export function isAssetGroupData(data: FlowNodeData): data is AssetGroupNodeData {
  return data.type === 'asset-group';
}

export function isNodeType(value: string | undefined): value is NodeType {
  return value !== undefined && Object.values(NODE_TYPES).includes(value as NodeType);
}

export function isEditableNode(
  nodeType: string | undefined,
): nodeType is
  | typeof NODE_TYPES.STORY_PACK
  | typeof NODE_TYPES.CHARACTER
  | typeof NODE_TYPES.SCENE {
  return isNodeType(nodeType) && EDITABLE_NODE_TYPES.includes(nodeType);
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

export interface CharacterAssetDisplay {
  id: string;
  name: string;
  portrait?: string;
}

export interface BackgroundAssetDisplay {
  id: string;
  name: string;
  url: string;
}

// ---------------------------------------------------------------------------
// Layout & visual constants
// ---------------------------------------------------------------------------

export const CANVAS_CONFIG = {
  NODE_WIDTH: 320,
  NODE_HEIGHT: 200,
  MINIMAP_SCALE: 0.08,
  SVG_WIDTH: 2000,
  SVG_HEIGHT: 1500,
} as const;

export const TRANSITION_EFFECTS = ['fade', 'dissolve', 'slide'] as const;
export type TransitionEffect = (typeof TRANSITION_EFFECTS)[number];

// ---------------------------------------------------------------------------
// Stage config types
// ---------------------------------------------------------------------------

export type StageLayoutSlot = {
  id: string;
  name: string;
  anchor: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  offset?: { x?: number; y?: number };
  size?: {
    widthPct?: number;
    heightPct?: number;
    widthPx?: number;
    heightPx?: number;
  };
  responsive?: Record<string, Record<string, unknown>>;
};

export type StageLayoutLayer = {
  id: string;
  name: string;
  zIndex?: number;
  slots: StageLayoutSlot[];
};

export type StageLayoutSpec = {
  version: string;
  layoutKey: string;
  name: string;
  viewport?: {
    width?: number;
    height?: number;
    unit?: 'px' | 'vw' | 'vh';
  };
  layers: StageLayoutLayer[];
};

export type TransitionSpec = {
  id: string;
  type: 'fade' | 'slide' | 'wipe' | 'blur' | 'scale' | 'rotate';
  duration?: number;
  easing?: string;
  delay?: number;
};

export type FxEffectSpec = {
  type: string;
  intensity?: number;
  enabled?: boolean;
};

export type FxPresetSpec = {
  id: string;
  effects: FxEffectSpec[];
};

export type StageSkinSpec = {
  version: string;
  skinKey: string;
  name: string;
  layoutRef: string;
  theme?: string;
  performanceTier?: 'low' | 'mid' | 'high';
  transitions?: TransitionSpec[];
  fxPresets?: FxPresetSpec[];
  bindings?: {
    components?: Record<string, unknown>;
    events?: Record<string, unknown>;
    states?: Record<string, unknown>;
  };
};
