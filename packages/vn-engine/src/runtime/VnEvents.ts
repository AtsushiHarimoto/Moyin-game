/**
 * VN Event Handler (Framework-Agnostic)
 * Purpose: Handle VN state machine side-effects and scene enter logic.
 * All .value accessors removed - state properties are accessed directly.
 *
 * Each method below is a placeholder that returns safe defaults.
 * Implement per project requirements to add custom event logic,
 * side-effect processing, and scene-enter behaviour.
 */
import type { VnRuntimeState } from './VnState';
import type { SceneData } from './VnContext';

type EventCompletionParams = {
  scene?: SceneData;
  chapterId?: string;
  inputType?: string;
  chipId?: string;
  choiceId?: string;
  optionId?: string;
  eventSignals?: string[];
  flags?: Set<string>;
  eventsDone?: Set<string>;
  allowEffects?: boolean;
  eventIdSet?: Set<string>;
};

type EventCompletionResult = {
  audit: {
    reasonCodes: string[];
    notes: string[];
  };
};

type GetSceneByIdFn = (id: string) => SceneData | undefined;

export const VnEvents = {
  /** Placeholder - implement per project requirements to resolve event completions. */
  resolveEventCompletions(_state: VnRuntimeState, _params: EventCompletionParams): EventCompletionResult {
    return {
      audit: {
        reasonCodes: [],
        notes: []
      }
    };
  },

  /** Placeholder - implement per project requirements to apply side-effects from a player choice. */
  applySideEffectsFromChoice(_state: VnRuntimeState, _choice: Record<string, unknown> | null, _flags?: Set<string>, _events?: Set<string>): void {
    // No-op: override to mutate flags/events based on the selected choice.
  },

  /** Placeholder - implement per project requirements to run logic on scene enter. */
  async applySceneEnter(_state: VnRuntimeState, sceneId: string, flags: Set<string>, events: Set<string>, getSceneById: GetSceneByIdFn, _chapterId?: string): Promise<{ flags: Set<string>; eventsDone: Set<string> }> {
    const scene = getSceneById(sceneId);
    if (!scene) return { flags, eventsDone: events };

    // Override to process scene.onEnter triggers, update flags, etc.
    return { flags, eventsDone: events };
  },

  /** Placeholder - implement per project requirements to emit named events. */
  emit(_name: string, _data: unknown): void {
    // No-op: override to broadcast events to external listeners.
  }
};
