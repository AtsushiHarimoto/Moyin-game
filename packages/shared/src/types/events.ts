/**
 * Event system types.
 *
 * Defines the event names and payload shapes used by the VN
 * runtime dispatcher. Framework-agnostic -- consumers wire
 * these into their own event bus or store.
 */

// ---------------------------------------------------------------------------
// VN runtime events (dispatched via the runtime store)
// ---------------------------------------------------------------------------

/**
 * Events recognised by the VN runtime dispatcher.
 *
 * Keyboard shortcuts and UI buttons are mapped to these strings,
 * which the dispatcher translates into state transitions.
 */
export type VnRuntimeEvent =
  | 'NEXT'
  | 'OPEN_BACKLOG'
  | 'CLOSE_BACKLOG'
  | 'OPEN_MENU'
  | 'CLOSE_MENU'
  | 'TOGGLE_TAB'
  | 'SUBMIT'
  | 'CANCEL_INPUT'
  | 'ESC';

// ---------------------------------------------------------------------------
// Input tab
// ---------------------------------------------------------------------------

/** Discriminator for the input-panel tab. */
export type InputTabType = 'action' | 'talk';

// ---------------------------------------------------------------------------
// Story-pack event kinds
// ---------------------------------------------------------------------------

/**
 * Allowed completion-condition kinds for story events.
 *
 * - `byFlag`      -- triggered when a flag is set
 * - `byChoice`    -- triggered by a player choice
 * - `byChip`      -- triggered by an action chip
 * - `byLLMSignal` -- triggered by an LLM-emitted signal
 */
export type EventCompletionKind =
  | 'byFlag'
  | 'byChoice'
  | 'byChip'
  | 'byLLMSignal';

// ---------------------------------------------------------------------------
// Ending types
// ---------------------------------------------------------------------------

export type EndingType = 'bad' | 'normal' | 'good' | 'true';

// ---------------------------------------------------------------------------
// Asset types
// ---------------------------------------------------------------------------

export type AssetType = 'bg' | 'portrait' | 'avatar' | 'bgm' | 'sfx' | 'other';

// ---------------------------------------------------------------------------
// Generic typed event map helper
// ---------------------------------------------------------------------------

/**
 * Helper type for building strongly-typed event maps.
 *
 * Currently an identity mapping. Future versions will add constraint
 * enforcement (e.g. requiring serialisable payloads) or automatic
 * event-name prefixing.
 *
 * Usage:
 * ```ts
 * type MyEvents = EventMap<{
 *   'scene:change': { sceneId: string };
 *   'turn:complete': { turnId: string; revision: number };
 * }>;
 * ```
 */
export type EventMap<T extends Record<string, unknown>> = {
  [K in keyof T]: T[K];
};
