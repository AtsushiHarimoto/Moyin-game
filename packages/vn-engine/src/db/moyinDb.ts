/**
 * Moyin Database (Framework-Agnostic)
 * Purpose: Global singleton Dexie database instance for managing all VN persistent data.
 * Dependency: dexie (framework-agnostic IndexedDB wrapper).
 */
import Dexie, { type Table } from 'dexie';
import type {
  CommitRow,
  EndingUnlockRow,
  SaveSlotRow,
  SessionRow,
  SnapshotRow,
  StoryPackRow,
  TurnRow,
} from './types';
import type {
  MemoryConfigRow,
  MemoryFactRow,
  MemoryLtmRow,
  MemoryMtmRow,
  MemoryStoreRow,
  MemoryStmRow
} from './types';

export const DB_SCHEMA_VERSION = 9;

export class MoyinDb extends Dexie {
  sessions!: Table<SessionRow, string>;
  turns!: Table<TurnRow, string>;
  commits!: Table<CommitRow, string>;
  endingUnlocks!: Table<EndingUnlockRow, string>;
  snapshots!: Table<SnapshotRow, string>;
  saveSlots!: Table<SaveSlotRow, string>;
  storyPacks!: Table<StoryPackRow, string>;
  memoryStores!: Table<MemoryStoreRow, string>;
  memoryConfigs!: Table<MemoryConfigRow, string>;
  memoryStm!: Table<MemoryStmRow, string>;
  memoryMtm!: Table<MemoryMtmRow, string>;
  memoryLtm!: Table<MemoryLtmRow, string>;
  memoryFacts!: Table<MemoryFactRow, [string, string]>;

  constructor() {
    super('MoyinVnDb');
    this.version(DB_SCHEMA_VERSION).stores({
      sessions:
        'sessionId, storyKey, status, lastPlayedAt',
      turns:
        'turnId, sessionId, revisionFrom, revisionTo, status, commitId, createdAt',
      commits:
        'commitId, sessionId, revisionTo, turnId, &idempotencyKey, createdAt',
      endingUnlocks: 'unlockId, storyKey, packVersion, endingId, unlockedAt',
      snapshots: 'snapshotId, sessionId, revision, commitId, createdAt',
      saveSlots: 'slotId, storyKey, packVersion, updatedAt',
      storyPacks: 'packId, storyKey, packVersion, status, importedAt, updatedAt',
      memoryStores: 'ownerId, updatedAt',
      memoryConfigs: 'ownerId, updatedAt',
      memoryStm: 'id, ownerId, turnIndex, createdAt',
      memoryMtm: 'id, ownerId, createdAt',
      memoryLtm: 'id, ownerId, createdAt, importance',
      memoryFacts: '[ownerId+id], ownerId, key, updatedAt',
    });
  }
}

export const moyinDb = new MoyinDb();
