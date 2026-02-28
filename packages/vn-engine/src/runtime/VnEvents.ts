// TODO: STUB -- Core game logic not yet implemented
/**
 * VN Event Handler (Framework-Agnostic)
 * Purpose: Handle VN state machine side-effects and scene enter logic.
 * All .value accessors removed - state properties are accessed directly.
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
  resolveEventCompletions(_state: VnRuntimeState, _params: EventCompletionParams): EventCompletionResult {
    // TODO: implement
    return {
      audit: {
        reasonCodes: [],
        notes: []
      }
    };
  },

  applySideEffectsFromChoice(_state: VnRuntimeState, _choice: Record<string, unknown> | null, _flags?: Set<string>, _events?: Set<string>): void {
    // TODO: implement
  },

  async applySceneEnter(_state: VnRuntimeState, sceneId: string, flags: Set<string>, events: Set<string>, getSceneById: GetSceneByIdFn, _chapterId?: string): Promise<{ flags: Set<string>; eventsDone: Set<string> }> {
    const scene = getSceneById(sceneId);
    if (!scene) return { flags, eventsDone: events };

    // TODO: implement
    return { flags, eventsDone: events };
  },

  emit(_name: string, _data: unknown): void {
    // TODO: implement
  }
};
