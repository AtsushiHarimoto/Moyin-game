/**
 * Story Flow type definitions
 * Defines data structures for flow canvas nodes and edges
 *
 * @see features/story-import/components/StoryFlowCanvas.tsx
 */

/* ========================================
 * Story Pack JSON Structures (shared types)
 * ======================================== */

/** Story pack JSON structure */
export interface StoryPackJson {
  manifest?: {
    storyKey: string
    title: string
    version: string
    author?: string
  }
  characters?: CharacterJson[]
  scenes?: SceneJson[]
  assets?: {
    baseUrl?: string
    items?: AssetItemJson[]
    backgrounds?: AssetJson[]
    bgm?: AssetJson[]
    se?: AssetJson[]
  }
  // Legacy format compatibility
  storyKey?: string
  title?: string
  version?: string
  [key: string]: unknown
}

/** Asset item JSON structure (new format) */
export interface AssetItemJson {
  assetKey: string
  type: 'portrait' | 'bg' | 'bgm' | 'sfx'
  url: string
  meta?: Record<string, unknown>
}

/** Character JSON structure */
export interface CharacterJson {
  charId?: string
  displayName?: string
  persona?: string
  assets?: {
    avatar?: string
    portraits?: Record<string, string>
  }
  // Legacy format
  id?: string
  name?: string
  sprites?: Array<{ url?: string }>
  [key: string]: unknown
}

/** Scene JSON structure */
export interface SceneJson {
  id: string
  name?: string
  background?: string
  dialogues?: unknown[]
  [key: string]: unknown
}

/** Asset JSON structure */
export interface AssetJson {
  id: string
  name?: string
  url?: string
}

/* ========================================
 * Node Data Types
 * ======================================== */

/** Story pack root node data */
export interface StoryPackNodeData {
  type: 'story-pack'
  title: string
  storyKey: string
  version: string
  author?: string
  coverImage?: string
}

/** Character node data */
export interface CharacterNodeData {
  type: 'character'
  id: string
  name: string
  originalId?: string
  portrait?: string
  expressionCount: number
  poseCount: number
}

/** Scene node data */
export interface SceneNodeData {
  type: 'scene'
  id: string
  name: string
  originalId?: string
  background?: string
  dialogueCount: number
  branchCount: number
}

/** Extended scene node data (with display fields) */
export interface ExtendedSceneNodeData extends SceneNodeData {
  dialogue?: string
  characterName?: string
  characterPortrait?: string
}

/** Asset group node data */
export interface AssetGroupNodeData {
  type: 'asset-group'
  category: 'backgrounds' | 'bgm' | 'se'
  items: AssetItem[]
  count: number
}

/** Asset item display */
export interface AssetItem {
  id: string
  name: string
  thumbnail?: string
}

/** Character asset display */
export interface CharacterAssetDisplay {
  id: string
  name: string
  portrait?: string
}

/** Background asset display */
export interface BackgroundAssetDisplay {
  id: string
  name: string
  url: string
}

/* ========================================
 * Union Types
 * ======================================== */

/** Union type for all node data */
export type FlowNodeData =
  | StoryPackNodeData
  | CharacterNodeData
  | ExtendedSceneNodeData
  | AssetGroupNodeData

/* ========================================
 * Type Guards
 * ======================================== */

export function isStoryPackData(data: FlowNodeData): data is StoryPackNodeData {
  return data.type === 'story-pack'
}

export function isCharacterData(data: FlowNodeData): data is CharacterNodeData {
  return data.type === 'character'
}

export function isSceneData(data: FlowNodeData): data is ExtendedSceneNodeData {
  return data.type === 'scene'
}

export function isAssetGroupData(data: FlowNodeData): data is AssetGroupNodeData {
  return data.type === 'asset-group'
}

export function isNodeType(value: string | undefined): value is NodeType {
  return value !== undefined && Object.values(NODE_TYPES).includes(value as NodeType)
}

/* ========================================
 * Story Flow Node / Edge (React Flow compatible)
 * ======================================== */

export interface StoryFlowNode {
  id: string
  type: string
  position: { x: number; y: number }
  data: FlowNodeData
  dimensions?: { width: number; height: number }
}

export interface StoryFlowEdge {
  id: string
  source: string
  target: string
  type?: string
  path?: string
}

/* ========================================
 * Node Type Constants
 * ======================================== */

export const NODE_TYPES = {
  STORY_PACK: 'story-pack',
  CHARACTER: 'character',
  SCENE: 'scene',
  ASSET_GROUP: 'asset-group',
} as const

export type NodeType = (typeof NODE_TYPES)[keyof typeof NODE_TYPES]

/* ========================================
 * Editable Node Types
 * ======================================== */

export const EDITABLE_NODE_TYPES: NodeType[] = [
  NODE_TYPES.STORY_PACK,
  NODE_TYPES.CHARACTER,
  NODE_TYPES.SCENE,
]

export function isEditableNode(
  nodeType: string | undefined,
): nodeType is
  | typeof NODE_TYPES.STORY_PACK
  | typeof NODE_TYPES.CHARACTER
  | typeof NODE_TYPES.SCENE {
  return isNodeType(nodeType) && EDITABLE_NODE_TYPES.includes(nodeType)
}

/* ========================================
 * Layout Configuration
 * ======================================== */

export const FLOW_LAYOUT = {
  ROOT_X: 400,
  ROOT_Y: 50,
  GROUP_GAP: 300,
  NODE_GAP: 180,
  NODE_WIDTH: 200,
  CHAR_START_X: 50,
  SCENE_START_X: 400,
  ASSET_START_X: 750,
  CHILD_START_Y: 250,
} as const

/* ========================================
 * Edge Type Constants
 * ======================================== */

export const EDGE_TYPES = {
  NEON: 'neon',
} as const

export type EdgeType = (typeof EDGE_TYPES)[keyof typeof EDGE_TYPES]

/* ========================================
 * Node Visual Constants
 * ======================================== */

export const NODE_COLORS: Record<NodeType, string> = {
  [NODE_TYPES.STORY_PACK]: '#a855f7',
  [NODE_TYPES.CHARACTER]: '#22c55e',
  [NODE_TYPES.SCENE]: '#3b82f6',
  [NODE_TYPES.ASSET_GROUP]: '#f59e0b',
}

export const NODE_ICONS: Record<NodeType, string> = {
  [NODE_TYPES.STORY_PACK]: 'movie_filter',
  [NODE_TYPES.CHARACTER]: 'person',
  [NODE_TYPES.SCENE]: 'chat_bubble',
  [NODE_TYPES.ASSET_GROUP]: 'palette',
}

/* ========================================
 * Canvas Configuration
 * ======================================== */

export const CANVAS_CONFIG = {
  NODE_WIDTH: 320,
  NODE_HEIGHT: 200,
  MINIMAP_SCALE: 0.08,
  SVG_WIDTH: 2000,
  SVG_HEIGHT: 1500,
} as const

/** Transition effects */
export const TRANSITION_EFFECTS = ['fade', 'dissolve', 'slide'] as const
export type TransitionEffect = (typeof TRANSITION_EFFECTS)[number]
