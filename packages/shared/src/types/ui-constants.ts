/**
 * UI layout and visual constants for the flow-graph editor.
 *
 * Separated from `vn.ts` to keep domain types distinct from
 * presentation concerns.
 */

import type { NodeType } from './vn.js';
import { NODE_TYPES } from './vn.js';

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

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
} as const;

// ---------------------------------------------------------------------------
// Node colours & icons
// ---------------------------------------------------------------------------

export const NODE_COLORS: Record<NodeType, string> = {
  [NODE_TYPES.STORY_PACK]: '#a855f7',
  [NODE_TYPES.CHARACTER]: '#22c55e',
  [NODE_TYPES.SCENE]: '#3b82f6',
  [NODE_TYPES.ASSET_GROUP]: '#f59e0b',
};

export const NODE_MATERIAL_ICONS: Record<NodeType, string> = {
  [NODE_TYPES.STORY_PACK]: 'movie_filter',
  [NODE_TYPES.CHARACTER]: 'person',
  [NODE_TYPES.SCENE]: 'chat_bubble',
  [NODE_TYPES.ASSET_GROUP]: 'palette',
};
