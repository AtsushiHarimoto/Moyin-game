/**
 * Turn Provider type definitions
 * Defines all core types for the AI turn processing system.
 */
import type { Phase } from '../db/types';

export type { Phase };

export const ENTRY_SENTINEL = '__enter__';

export type PortraitView = {
  id: string;
  poseKey?: string;
  poseUrl?: string;
  position?: 'left' | 'center' | 'right';
};

export type StageView = {
  bgKey?: string;
  bgUrl?: string;
  portraits?: PortraitView[];
  bgmKey?: string;
  bgmUrl?: string;
  sfxKey?: string;
};

export type Frame = {
  id: string;
  speaker?: string;
  text: string;
  canNext?: boolean;
};

export type EngineFrame = Frame;

export type ChoiceOption = {
  optionId: string;
  text: string;
  targetSceneId: string;
};

export type ChoiceView = {
  choiceId: string;
  options: ChoiceOption[];
};

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
  relationship?: Record<string, {value: number}>;
  playerId?: string | null;
  targetCharId?: string | null;
};

export type TurnInput =
  | {
      inputType: 'talk';
      text: string;
      targetCharId?: string | null;
    }
  | {
      inputType: 'action';
      chipId: string;
      targetCharId?: string | null;
    }
  | {
      inputType: 'choice';
      optionId: string;
    };

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
  relationshipDelta?: Array<{
    fromWho: string;
    toWho: string;
    trackKey: string;
    delta: number;
    note?: string;
    reason?: string;
  }>;
};

export interface TurnProvider {
  submitTurn(ctx: TurnContext, input: TurnInput): Promise<TurnResult>;
}
