/**
 * VN Replay Engine (Framework-Agnostic)
 * Purpose: Manage game history replay functionality.
 * All .value accessors removed - state properties are accessed directly.
 */
import type { VnRuntimeState } from './VnState';
import type { TurnOutputPayload } from '../db/types';
import type { StageView, PortraitView } from '../providers/types';

export interface VnReplayOptions {
  advanceFrame: () => void;
}

export class VnReplayEngine {
  constructor(
    private state: VnRuntimeState,
    private options: VnReplayOptions
  ) {}

  loadStep(index: number): boolean {
    const state = this.state;

    if (index < 0 || index >= state.replaySteps.length) return false;

    const step = state.replaySteps[index];
    const { turn } = step;

    const hasOutput = turn.output && typeof turn.output === 'object';
    const turnResult = hasOutput
      ? (turn.output as TurnOutputPayload)
      : ({
          frames: turn.frames || [],
          stageView: turn.stageView,
          choiceView: turn.choiceView,
          endingId: turn.endingId,
        } as TurnOutputPayload);

    if (turnResult.stageView) {
      const normalized: StageView = { ...turnResult.stageView };
      if (Array.isArray(normalized.portraits) && normalized.portraits.length > 1) {
        const portraits = normalized.portraits;
        const positions = portraits.map((p: PortraitView) => p?.position).filter(Boolean);
        const hasDuplicates = new Set(positions).size !== positions.length;
        if (!positions.length || hasDuplicates) {
          normalized.portraits = portraits.map((portrait: PortraitView, idx: number) => {
            let position = portrait?.position;
            if (!position || hasDuplicates) {
              if (portraits.length === 2) position = idx === 0 ? 'left' : 'right';
              else if (idx === 0) position = 'left';
              else if (idx === 1) position = 'center';
              else position = 'right';
            }
            return { ...portrait, position };
          });
        }
      }
      state.stageView = normalized;
    }
    state.choiceView = turnResult.choiceView || null;

    const frames = turnResult.frames || [];
    state.frameQueue = frames;
    state.playheadIndex = -1;

    state.phase = 'playing';

    this.options.advanceFrame();
    return true;
  }

  next() {
    const state = this.state;

    const lastIndex = state.frameQueue.length - 1;
    if (state.playheadIndex < lastIndex) {
      state.playheadIndex += 1;
      state.isTyping = true;
      return;
    }

    const nextIndex = state.replayIndex + 1;
    if (this.loadStep(nextIndex)) {
      state.replayIndex = nextIndex;
    } else {
      this.finish();
    }
  }

  finish() {
    const state = this.state;

    state.replayEndMessageShown = true;

    const lastStep = state.replaySteps[state.replayIndex];
    if (lastStep?.turn) {
      const lastTurn = lastStep.turn;
      const lastEndingId = lastTurn.output?.endingId || lastTurn.endingId;
      if (lastEndingId) {
        state.endingId = lastEndingId;
      }
    }

    state.phase = 'ended';
  }
}
