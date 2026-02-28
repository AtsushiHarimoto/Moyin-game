import { moyinDb } from './moyinDb'
import type { CommitRow, EndingUnlockRow, SessionRow, TurnRow } from '@moyin/vn-engine'

export async function createSession(row: SessionRow) {
  await moyinDb.sessions.put(row)
  return row.sessionId
}

export async function getSession(sessionId: string) {
  return moyinDb.sessions.get(sessionId)
}

export async function addTurn(row: TurnRow) {
  return moyinDb.turns.put(row)
}

export async function addCommit(row: CommitRow) {
  return moyinDb.commits.put(row)
}

export async function updateSession(sessionId: string, patch: Partial<SessionRow>) {
  return moyinDb.sessions.update(sessionId, patch)
}

export async function upsertEndingUnlock(row: EndingUnlockRow) {
  await moyinDb.endingUnlocks.put(row)
  return row.unlockId
}
