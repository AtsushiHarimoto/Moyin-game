/**
 * VN Backlog Manager (Framework-Agnostic)
 * Purpose: Manage game history records (Backlog).
 * All .value accessors removed - state properties are accessed directly.
 */
import type { VnRuntimeState, BacklogItem } from './VnState';
import type { TurnRow } from '../db/types';

export type { BacklogItem };

export class VnBacklogManager {
  constructor(private state: VnRuntimeState) {}

  populateFromTurns(turns: TurnRow[], limitRevision?: number) {
    const items: BacklogItem[] = (turns || [])
      .filter(turn => limitRevision === undefined || (turn.revisionTo ?? 0) <= limitRevision)
      .flatMap(turn =>
        (turn.frames || []).map(frame => ({
          id: `${turn.turnId}-${frame.id}`,
          speaker: frame.speaker,
          text: frame.text,
          timestamp: turn.finishedAt || turn.createdAt,
          type: turn.inputType === 'system' ? 'system' : 'dialogue',
        } as BacklogItem)),
      );
    this.state.backlogItems = items;
  }

  addSystemMessage(msg: string, idSuffix: string = 'sys') {
    this.state.backlogItems.push({
      id: `sys-${Date.now()}-${idSuffix}`,
      speaker: 'system',
      text: msg,
      timestamp: new Date().toISOString(),
      type: 'system',
    });
  }

  addTurn(turn: TurnRow) {
    const newItems = (turn.frames || []).map(frame => ({
      id: `${turn.turnId}-${frame.id}`,
      speaker: frame.speaker,
      text: frame.text,
      timestamp: turn.finishedAt || turn.createdAt,
      type: turn.inputType === 'system' ? 'system' : 'dialogue',
    } as BacklogItem));
    this.state.backlogItems.push(...newItems);

    if (this.state.backlogItems.length > 200) {
      this.state.backlogItems = this.state.backlogItems.slice(-200);
    }
  }
}
