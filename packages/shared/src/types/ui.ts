/**
 * UI state types.
 *
 * Framework-agnostic descriptions of the visual novel player's
 * UI settings, theme preferences, and cursor configuration.
 */

// ---------------------------------------------------------------------------
// Background
// ---------------------------------------------------------------------------

export interface BackgroundProps {
  /** When `true`, all background animations are disabled. */
  noAnim: boolean;
}

// ---------------------------------------------------------------------------
// UI preferences
// ---------------------------------------------------------------------------

/** Full set of user-configurable UI preferences. */
export interface UiPreferences {
  enableMouseFollow: boolean;
  enableCustomCursor: boolean;
  enableSakura: boolean;
  autoHideMenu: boolean;
  currentTheme: string;
  backgroundProps: BackgroundProps;
}

// ---------------------------------------------------------------------------
// VN runtime UI prefs (within gameplay)
// ---------------------------------------------------------------------------

export interface VnUiPrefs {
  /** Enable breathing animation on character portraits. */
  enableBreath: boolean;
}

// ---------------------------------------------------------------------------
// Action & template types (input panel)
// ---------------------------------------------------------------------------

/** A predefined action the player can select. */
export interface ActionItem {
  id: string;
  label: string;
  keywords: string[];
}

/** A quick-input template for the talk panel. */
export interface TalkTemplate {
  id: string;
  title: string;
  prefix: string;
}

// ---------------------------------------------------------------------------
// Character selection
// ---------------------------------------------------------------------------

/** Minimal character info for the selection list. */
export interface CharacterSelectItem {
  id: string;
  nickname: string;
  avatarUrl?: string;
}

// ---------------------------------------------------------------------------
// Backlog
// ---------------------------------------------------------------------------

/** A single entry in the dialogue backlog. */
export interface BacklogEntry {
  id: string;
  role: 'player' | 'npc' | 'system';
  speaker: string;
  text: string;
  timestamp: string;
  type: 'dialogue' | 'action' | 'system';
}
