/**
 * Memory Fact Extraction (Framework-Agnostic)
 * Purpose: Extract KV facts from dialogue content and validate against Canon.
 */
import { err, ok, type Result } from '../utils/result';
import type { MemoryError } from './memory-errors';
import { failMemory } from './memory-errors';
import type { MemoryCanonStatus, MemoryFact } from './memory-types';
import { createStableId, toIsoString } from './memory-utils';

export type FactExtractionOptions = {
  ownerId: string;
  sourceTurnId: string;
};

export interface FactExtractor {
  extract(content: string, options: FactExtractionOptions): Promise<Result<MemoryFact[], MemoryError>>;
}

export interface CanonValidator {
  validateFact(fact: MemoryFact): Promise<Result<{ status: MemoryCanonStatus }, MemoryError>>;
}

export class LocalFactExtractor implements FactExtractor {
  async extract(content: string, options: FactExtractionOptions): Promise<Result<MemoryFact[], MemoryError>> {
    try {
      const matches = content.match(/([\w.]+)\s*[:=]\s*([^\s]+)/g) || [];
      const facts = matches.map((segment) => {
        const parts = segment.split(/[:=]/).map((item) => item.trim());
        const key = parts[0] ?? '';
        const value = parts[1] ?? '';
        const now = toIsoString();
        return {
          id: createStableId('fact', [options.ownerId, options.sourceTurnId, key, value]),
          ownerId: options.ownerId,
          key,
          value,
          sourceTurnId: options.sourceTurnId,
          confidence: 0.5,
          canonStatus: 'pending_check',
          conflictStatus: 'resolved',
          factHistory: [],
          createdAt: now,
          updatedAt: now
        } satisfies MemoryFact;
      });
      return ok(facts);
    } catch (error) {
      return err(
        failMemory('FACT_EXTRACTION_FAILED', 'Fact extraction failed', {
          message: error instanceof Error ? error.message : String(error)
        })
      );
    }
  }
}

export class NoopCanonValidator implements CanonValidator {
  async validateFact(_fact: MemoryFact): Promise<Result<{ status: MemoryCanonStatus }, MemoryError>> {
    return ok({ status: 'valid' });
  }
}
