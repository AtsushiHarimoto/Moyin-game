/**
 * VN Runtime Constants
 * Purpose: Define runtime constants and configuration values.
 * Design: Centralized management to avoid magic numbers.
 */

/** Maximum relationship delta per talk turn. Range: [-10, +10] */
export const TALK_RELATIONSHIP_CAP = 10;

/** Default player character ID */
export const DEFAULT_PLAYER_ID = 'player';

/** Default max frames per LLM response */
export const DEFAULT_MAX_FRAMES = 3;

/** Maximum text length per dialogue frame */
export const MAX_FRAME_TEXT = 120;

/** Maximum characters for dialogue preview */
export const TALK_PREVIEW_MAX = 20;

/**
 * Script step type for Auto Play or predefined scripts.
 */
export type ScriptStep = {
  type: 'talk' | 'action' | 'choice';
  text?: string;
  chipId?: string;
  optionId?: string;
  targetSceneId?: string;
};
