/**
 * VN Context Tools (Framework-Agnostic)
 * Purpose: Provide context computation utilities for VN runtime.
 * All .value accessors removed - state properties are accessed directly.
 */
import type { VnRuntimeState } from './VnState';
import type { StageView, PortraitView } from '../providers/types';
import type { StageHints } from '../providers/llm/types';
import type { Phase } from '../db/types';

export type SceneCharacter = {
  charId: string;
  position?: 'left' | 'center' | 'right';
  [key: string]: unknown;
};

export type UnlockConditions = {
  requireFlags?: string | string[];
  forbidFlags?: string | string[];
};

export type ChoicePointOption = {
  optionId?: string;
  text?: string;
  targetSceneId?: string;
  [key: string]: unknown;
};

export type ChoicePoint = {
  choiceId?: string;
  options?: ChoicePointOption[];
  unlockConditions?: UnlockConditions;
};

export type SceneData = {
  sceneId?: string;
  chapterId?: string;
  activeCast?: string[];
  characters?: SceneCharacter[];
  choicePoints?: ChoicePoint[];
  context?: string | string[];
  bgKey?: string;
  bgmKey?: string;
  defaultTargetCharId?: string;
  events?: Array<{ eventId?: string; [key: string]: unknown }>;
  [key: string]: unknown;
};

export type StageViewResult = StageView & {
  sfxKey?: string;
};

export type SnapshotPayload = {
  activeChapterId: string;
  activeSceneId: string;
  phase: Phase;
  endingId: string | null;
  playerId: string | null;
  targetCharId: string | null;
  relationship: Record<string, number | Record<string, number>>;
  flags: string[];
  eventsDone: string[];
  createdAt: string;
  [key: string]: unknown;
};

export const VnContext = {
  syncFocusAndTarget(state: VnRuntimeState, scene: SceneData | undefined): void {
    if (!state.targetCharId && scene?.defaultTargetCharId) {
      state.targetCharId = scene.defaultTargetCharId;
    }
  },

  getActiveCastForProvider(state: VnRuntimeState, scene: SceneData | undefined): string[] {
    const cast = new Set<string>();
    if (scene?.activeCast && Array.isArray(scene.activeCast)) {
      scene.activeCast.forEach((id: string) => cast.add(id));
    }
    if (scene?.characters) {
      scene.characters.forEach((c) => cast.add(c.charId));
    }
    return Array.from(cast);
  },

  getDialogueCandidates(state: VnRuntimeState, scene: SceneData | undefined): string[] {
    const cast = this.getActiveCastForProvider(state, scene);
    return cast.filter(id => id !== state.playerId);
  },

  resolveChoiceView(scene: SceneData | undefined, flags: Set<string>, options: { enforceConditions?: boolean; allowImmediate?: boolean }) {
    const choicePoints = Array.isArray(scene?.choicePoints) ? scene!.choicePoints! : [];
    if (!choicePoints.length) return null;

    const shouldEnforce = options?.enforceConditions !== false;
    const toFlagArray = (value?: string | string[]): string[] => {
      if (!value) return [];
      return Array.isArray(value) ? value : [value];
    };
    const isUnlockSatisfied = (unlockConditions?: UnlockConditions): boolean => {
      if (!unlockConditions) return true;
      const requireFlags = toFlagArray(unlockConditions.requireFlags);
      const forbidFlags = toFlagArray(unlockConditions.forbidFlags);
      const hasAllRequired = requireFlags.every(flag => flags.has(flag));
      const hasAnyForbidden = forbidFlags.some(flag => flags.has(flag));
      return hasAllRequired && !hasAnyForbidden;
    };

    const resolved = choicePoints.find((point) => {
      if (!point?.choiceId || !Array.isArray(point.options) || point.options.length === 0) return false;
      if (!shouldEnforce) return true;
      return isUnlockSatisfied(point.unlockConditions);
    });

    if (!resolved) return null;
    const optionsList = (resolved.options || []).filter((option) => {
      return typeof option?.optionId === 'string' && typeof option?.text === 'string' && typeof option?.targetSceneId === 'string';
    });
    if (!optionsList.length) return null;

    return {
      choiceId: resolved.choiceId!,
      options: optionsList as Array<{ optionId: string; text: string; targetSceneId: string }>
    };
  },

  getSceneContext(scene: SceneData | undefined): string[] {
    if (Array.isArray(scene?.context)) return scene!.context as string[];
    if (typeof scene?.context === 'string') return [scene.context];
    return [];
  },

  getTalkTargets(state: VnRuntimeState, scene: SceneData | undefined): string[] {
    return this.getDialogueCandidates(state, scene);
  },

  assetUrlByKey(state: VnRuntimeState, key?: string): string {
    if (!key) return '';
    if (key.startsWith('http') || key.startsWith('data:')) return key;
    const asset = state.assetsByKey[key];
    if (!asset) return '';
    const path = asset.path || asset.url || '';
    if (path.startsWith('http')) return path;
    const base = state.assetsBaseUrl.replace(/\/$/, '');
    const rel = path.replace(/^\//, '');
    return `${base}/${rel}`;
  },

  resolvePortraitKey(state: VnRuntimeState, charId: string): string | undefined {
    const char = state.charactersById[charId];
    const portraits: Record<string, string> = char?.assets?.portraits || {};
    const firstKey = Object.keys(portraits)[0];
    const portraitKey = firstKey ? portraits[firstKey] : undefined;
    return portraitKey || char?.assets?.avatar;
  },

  resolvePoseUrl(state: VnRuntimeState, poseUrl?: string, fallbackKey?: string): string {
    if (poseUrl && state.assetsByKey[poseUrl]) return this.assetUrlByKey(state, poseUrl);
    if (poseUrl && (poseUrl.startsWith('http') || poseUrl.startsWith('/'))) return poseUrl;
    if (fallbackKey && (fallbackKey.startsWith('http') || fallbackKey.startsWith('/'))) return fallbackKey;
    return this.assetUrlByKey(state, fallbackKey);
  },

  buildStageView(state: VnRuntimeState, scene: SceneData | undefined, hints?: Partial<StageHints>): StageViewResult {
    const baseIds = this.getDialogueCandidates(state, scene).slice(0, 2);
    const hintedList = Array.isArray(hints?.portraits) ? hints!.portraits! : [];
    const portraitKeys = hintedList.filter((item): item is string => typeof item === 'string');
    const portraitKeySet = new Set(portraitKeys);

    const resolveHintKey = (id: string): string | null => {
      if (!portraitKeySet.size) return null;
      const char = state.charactersById[id];
      const portraits: Record<string, string> = char?.assets?.portraits || {};
      return Array.from(portraitKeySet).find(k => portraits[k] || k === char?.assets?.avatar) || null;
    };

    const castList = Array.from(new Set([...portraitKeys.map(k => {
        for (const id in state.charactersById) {
            if (state.charactersById[id].assets?.portraits?.[k]) return id;
        }
        return null;
    }).filter((id): id is string => id !== null), ...baseIds]));

    const rawPortraits = castList.map((id) => {
      const charConfig = scene?.characters?.find((c) => c.charId === id);
      const hintKey = resolveHintKey(id);
      const poseKey = hintKey || this.resolvePortraitKey(state, id);

      return {
        id,
        poseKey,
        poseUrl: this.assetUrlByKey(state, poseKey),
        position: charConfig?.position
      };
    });

    const positions = rawPortraits.map(p => p.position).filter(Boolean);
    const hasDuplicates = new Set(positions).size !== positions.length;

    const portraits: PortraitView[] = rawPortraits.map((p, idx) => {
       let position = p.position;
       if (!position || hasDuplicates) {
         if (rawPortraits.length === 2) {
           position = idx === 0 ? 'left' : 'right';
         } else if (rawPortraits.length === 1) {
           position = 'center';
         } else {
           if (idx === 0) position = 'left';
           else if (idx === 1) position = 'center';
           else position = 'right';
         }
       }
       return { ...p, position };
    });

    const bgKey = hints?.bgKey ?? scene?.bgKey;
    const bgUrl = this.assetUrlByKey(state, bgKey ?? undefined);
    const bgmKey = hints?.bgmKey ?? scene?.bgmKey;
    const bgmUrl = this.assetUrlByKey(state, bgmKey);

    return {
      bgKey: bgKey ?? undefined,
      bgUrl,
      portraits,
      bgmKey: bgmKey ?? undefined,
      bgmUrl,
      sfxKey: hints?.sfxKey ?? undefined
    };
  },

  buildSnapshotPayload(state: VnRuntimeState, extra?: Record<string, unknown>): SnapshotPayload {
    return {
      activeChapterId: state.activeChapterId,
      activeSceneId: state.activeSceneId,
      phase: state.phase,
      endingId: state.endingId,
      playerId: state.playerId,
      targetCharId: state.targetCharId,
      relationship: JSON.parse(JSON.stringify(state.relationship)),
      flags: Array.from(state.flagsSet),
      eventsDone: Array.from(state.eventsDone),
      createdAt: new Date().toISOString(),
      ...extra
    };
  }
};
