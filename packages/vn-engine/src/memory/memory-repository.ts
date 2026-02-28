/**
 * Memory Repository (Framework-Agnostic)
 * Purpose: Data access layer for Memory-related Dexie read/write.
 */
import { err, ok, type Result } from '../utils/result';
import { moyinDb } from '../db/moyinDb';
import type {
  MemoryConfigRow,
  MemoryFactRow,
  MemoryLtmRow,
  MemoryMtmRow,
  MemoryStoreRow,
  MemoryStmRow
} from '../db/types';
import { failMemory } from './memory-errors';
import type { MemoryError } from './memory-errors';

export class MemoryRepository {
  async getStoreMeta(ownerId: string): Promise<Result<MemoryStoreRow | null, MemoryError>> {
    try {
      const row = await moyinDb.memoryStores.get(ownerId);
      return ok(row ?? null);
    } catch (error) {
      return err(
        failMemory('DB_READ_FAILED', 'Failed to read memory store meta', {
          message: error instanceof Error ? error.message : String(error)
        })
      );
    }
  }

  async upsertStoreMeta(row: MemoryStoreRow): Promise<Result<void, MemoryError>> {
    try {
      await moyinDb.memoryStores.put(row);
      return ok(undefined);
    } catch (error) {
      return err(
        failMemory('DB_WRITE_FAILED', 'Failed to write memory store meta', {
          message: error instanceof Error ? error.message : String(error)
        })
      );
    }
  }

  async getConfig(ownerId: string): Promise<Result<MemoryConfigRow | null, MemoryError>> {
    try {
      const row = await moyinDb.memoryConfigs.get(ownerId);
      return ok(row ?? null);
    } catch (error) {
      return err(
        failMemory('DB_READ_FAILED', 'Failed to read memory config', {
          message: error instanceof Error ? error.message : String(error)
        })
      );
    }
  }

  async upsertConfig(row: MemoryConfigRow): Promise<Result<void, MemoryError>> {
    try {
      await moyinDb.memoryConfigs.put(row);
      return ok(undefined);
    } catch (error) {
      return err(
        failMemory('DB_WRITE_FAILED', 'Failed to write memory config', {
          message: error instanceof Error ? error.message : String(error)
        })
      );
    }
  }

  async listStm(ownerId: string): Promise<Result<MemoryStmRow[], MemoryError>> {
    try {
      const rows = await moyinDb.memoryStm.where('ownerId').equals(ownerId).sortBy('turnIndex');
      return ok(rows);
    } catch (error) {
      return err(
        failMemory('DB_READ_FAILED', 'Failed to list STM rows', {
          message: error instanceof Error ? error.message : String(error)
        })
      );
    }
  }

  async addStm(row: MemoryStmRow): Promise<Result<void, MemoryError>> {
    try {
      await moyinDb.memoryStm.put(row);
      return ok(undefined);
    } catch (error) {
      return err(
        failMemory('DB_WRITE_FAILED', 'Failed to write STM row', {
          message: error instanceof Error ? error.message : String(error)
        })
      );
    }
  }

  async deleteStmByIds(ids: string[]): Promise<Result<void, MemoryError>> {
    try {
      await moyinDb.memoryStm.bulkDelete(ids);
      return ok(undefined);
    } catch (error) {
      return err(
        failMemory('DB_WRITE_FAILED', 'Failed to delete STM rows', {
          message: error instanceof Error ? error.message : String(error)
        })
      );
    }
  }

  async getLatestSummary(ownerId: string): Promise<Result<MemoryMtmRow | null, MemoryError>> {
    try {
      const rows = await moyinDb.memoryMtm.where('ownerId').equals(ownerId).reverse().sortBy('createdAt');
      return ok(rows[0] ?? null);
    } catch (error) {
      return err(
        failMemory('DB_READ_FAILED', 'Failed to read MTM summary', {
          message: error instanceof Error ? error.message : String(error)
        })
      );
    }
  }

  async addSummary(row: MemoryMtmRow): Promise<Result<void, MemoryError>> {
    try {
      await moyinDb.memoryMtm.put(row);
      return ok(undefined);
    } catch (error) {
      return err(
        failMemory('DB_WRITE_FAILED', 'Failed to write MTM summary', {
          message: error instanceof Error ? error.message : String(error)
        })
      );
    }
  }

  async listFacts(ownerId: string, keyPrefix?: string): Promise<Result<MemoryFactRow[], MemoryError>> {
    try {
      if (!keyPrefix) {
        const rows = await moyinDb.memoryFacts.where('ownerId').equals(ownerId).toArray();
        return ok(rows);
      }
      const rows = await moyinDb.memoryFacts
        .where('ownerId')
        .equals(ownerId)
        .filter((row: MemoryFactRow) => row.key.startsWith(keyPrefix))
        .toArray();
      return ok(rows);
    } catch (error) {
      return err(
        failMemory('DB_READ_FAILED', 'Failed to list memory facts', {
          message: error instanceof Error ? error.message : String(error)
        })
      );
    }
  }

  async getFact(ownerId: string, factId: string): Promise<Result<MemoryFactRow | null, MemoryError>> {
    try {
      const row = await moyinDb.memoryFacts.get([ownerId, factId]);
      return ok(row ?? null);
    } catch (error) {
      return err(
        failMemory('DB_READ_FAILED', 'Failed to read memory fact', {
          message: error instanceof Error ? error.message : String(error)
        })
      );
    }
  }

  async upsertFacts(rows: MemoryFactRow[]): Promise<Result<void, MemoryError>> {
    try {
      await moyinDb.memoryFacts.bulkPut(rows);
      return ok(undefined);
    } catch (error) {
      return err(
        failMemory('DB_WRITE_FAILED', 'Failed to write memory facts', {
          message: error instanceof Error ? error.message : String(error)
        })
      );
    }
  }

  async deleteFact(ownerId: string, factId: string): Promise<Result<void, MemoryError>> {
    try {
      await moyinDb.memoryFacts.delete([ownerId, factId]);
      return ok(undefined);
    } catch (error) {
      return err(
        failMemory('DB_WRITE_FAILED', 'Failed to delete memory fact', {
          message: error instanceof Error ? error.message : String(error)
        })
      );
    }
  }

  async upsertLtm(row: MemoryLtmRow): Promise<Result<void, MemoryError>> {
    try {
      await moyinDb.memoryLtm.put(row);
      return ok(undefined);
    } catch (error) {
      return err(
        failMemory('DB_WRITE_FAILED', 'Failed to write LTM row', {
          message: error instanceof Error ? error.message : String(error)
        })
      );
    }
  }

  async getLtm(ownerId: string, id: string): Promise<Result<MemoryLtmRow | null, MemoryError>> {
    try {
      const row = await moyinDb.memoryLtm.get(id);
      if (!row || row.ownerId !== ownerId) return ok(null);
      return ok(row);
    } catch (error) {
      return err(
        failMemory('DB_READ_FAILED', 'Failed to read LTM row', {
          message: error instanceof Error ? error.message : String(error)
        })
      );
    }
  }

  async deleteLtm(_ownerId: string, id: string): Promise<Result<void, MemoryError>> {
    try {
      await moyinDb.memoryLtm.delete(id);
      return ok(undefined);
    } catch (error) {
      return err(
        failMemory('DB_WRITE_FAILED', 'Failed to delete LTM row', {
          message: error instanceof Error ? error.message : String(error)
        })
      );
    }
  }

  async listLtm(ownerId: string): Promise<Result<MemoryLtmRow[], MemoryError>> {
    try {
      const rows = await moyinDb.memoryLtm.where('ownerId').equals(ownerId).toArray();
      return ok(rows);
    } catch (error) {
      return err(
        failMemory('DB_READ_FAILED', 'Failed to list LTM rows', {
          message: error instanceof Error ? error.message : String(error)
        })
      );
    }
  }
}
