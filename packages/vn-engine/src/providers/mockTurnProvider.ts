/**
 * Mock Turn Provider
 * Purpose: Provides simulated AI turn data for development and testing.
 * Implements the TurnProvider interface with deterministic mock responses.
 */
import type { TurnContext, TurnInput, TurnProvider, TurnResult } from './types';
import { createStableId } from '../memory/memory-utils';

function resolveInputText(input: TurnInput): string {
  switch (input.inputType) {
    case 'talk':
      return input.text;
    case 'action':
      return `Execute action: ${input.chipId}`;
    case 'choice':
      return `Select: ${input.optionId}`;
  }
}

export const mockTurnProvider: TurnProvider = {
  async submitTurn(ctx: TurnContext, input: TurnInput): Promise<TurnResult> {
    const text = resolveInputText(input);

    return {
      frames: [
        {
          id: createStableId('mock-frame', [
            ctx.activeSceneId,
            ctx.turnCountWithinScene,
            text,
          ]),
          speaker: 'System',
          text: `[Mock] Received input: ${text}`,
          canNext: true,
        },
      ],
      stageView: undefined,
      choiceView: null,
      endingId: null,
    };
  },
};
