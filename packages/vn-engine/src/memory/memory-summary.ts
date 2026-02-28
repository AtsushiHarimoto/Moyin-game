/**
 * Memory Summary Provider (Framework-Agnostic)
 * Purpose: Encapsulate MTM summary generation pipeline.
 */
import { err, ok, type Result } from '../utils/result';
import type { MemoryError } from './memory-errors';
import { failMemory } from './memory-errors';
import type { DialogueTurn, EpisodeSummary, EmotionState } from './memory-types';
import { createStableId, toIsoString } from './memory-utils';

export type SummaryOptions = {
  ownerId: string;
  sourceTurnId: string;
  emotion?: EmotionState;
};

export interface SummaryProvider {
  summarize(turns: DialogueTurn[], options: SummaryOptions): Promise<Result<EpisodeSummary, MemoryError>>;
}

export class LocalSummaryProvider implements SummaryProvider {
  async summarize(turns: DialogueTurn[], options: SummaryOptions): Promise<Result<EpisodeSummary, MemoryError>> {
    if (turns.length === 0) {
      return err(failMemory('SUMMARY_FAILED', 'No turns to summarize'));
    }
    const summaryText = turns
      .slice(-6)
      .map((turn) => `${turn.role === 'user' ? '\u73A9\u5BB6' : '\u89D2\u8272'}\uFF1A${turn.content}`)
      .join(' ')
      .slice(0, 240);

    const summary: EpisodeSummary = {
      id: createStableId('mtm', [options.ownerId, options.sourceTurnId, summaryText]),
      ownerId: options.ownerId,
      summary: summaryText,
      mood: options.emotion?.type || 'neutral',
      goals: [],
      sourceTurnId: options.sourceTurnId,
      importanceScore: Math.min(1, summaryText.length / 240),
      tags: [],
      emotion: options.emotion,
      createdAt: toIsoString()
    };
    return ok(summary);
  }
}
