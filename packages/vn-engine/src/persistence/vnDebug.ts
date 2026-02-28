/**
 * VN Debug Utilities (Framework-Agnostic)
 * Purpose: Debug dump functions for sessions.
 */
import { moyinDb } from '../db/moyinDb';

export async function dumpSessionToConsole(sessionId: string) {
  const session = await moyinDb.sessions.get(sessionId);
  const turns = await moyinDb.turns.where('sessionId').equals(sessionId).toArray();
  const commits = await moyinDb.commits.where('sessionId').equals(sessionId).toArray();

  console.groupCollapsed(`[VNDB] Dump session ${sessionId}`);
  console.log('session', session);
  console.log('turns', turns);
  console.log('commits', commits);
  console.groupEnd();

  return { session, turns, commits };
}

export async function dumpLatestSessionToConsole() {
  const latest = await moyinDb.sessions.orderBy('updatedAt').last();
  if (!latest?.sessionId) {
    console.info('[VNDB] No sessions found');
    return null;
  }
  return dumpSessionToConsole(latest.sessionId);
}
