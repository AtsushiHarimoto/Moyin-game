import type {
  EpisodeSummary,
  MemoryConfig,
  MemoryContext,
  MemoryContextBlock,
  MemoryFact,
  SemanticMemory,
  ShortTermMemory
} from './memory-types';

export const DEFAULT_MEMORY_CONFIG: MemoryConfig = {
  stmMaxTurns: 10,
  summaryThreshold: 8,
  ltmDefaultTopK: 3,
  minSimilarity: 0.7,
  autoExtractFacts: true,
  enableCanonValidation: true,
  ltmMaxEntries: 10000,
  summaryMaxRetries: 2,
  summaryRetryDelayMs: 5000
};

export const toIsoString = (date = new Date()): string => date.toISOString();

export const clampNumber = (value: number, min: number, max: number): number => {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
};

export const cosineSimilarity = (a: number[], b: number[]): number => {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  if (!normA || !normB) return 0;
  return dot / Math.sqrt(normA * normB);
};

export const hashString = (input: string): string => {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
};

export const createStableId = (prefix: string, parts: Array<string | number | undefined | null>): string => {
  const seed = parts.filter((part) => part !== undefined && part !== null).join('::');
  return `${prefix}_${hashString(seed)}`;
};

export const normalizeMemoryConfig = (input: unknown): MemoryConfig => {
  if (!input || typeof input !== 'object') return DEFAULT_MEMORY_CONFIG;
  const raw = input as Record<string, unknown>;
  const parseNumber = (key: keyof MemoryConfig, fallback: number, min?: number, max?: number) => {
    const value = raw[key];
    const num = typeof value === 'number' ? value : Number(value);
    if (Number.isNaN(num)) return fallback;
    if (min !== undefined && max !== undefined) return clampNumber(num, min, max);
    return num;
  };
  const parseBoolean = (key: keyof MemoryConfig, fallback: boolean) => {
    const value = raw[key];
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return ['1', 'true', 'yes', 'y', 'on'].includes(value.toLowerCase());
    return fallback;
  };

  return {
    stmMaxTurns: parseNumber('stmMaxTurns', DEFAULT_MEMORY_CONFIG.stmMaxTurns, 5, 20),
    summaryThreshold: parseNumber('summaryThreshold', DEFAULT_MEMORY_CONFIG.summaryThreshold, 3, 50),
    ltmDefaultTopK: parseNumber('ltmDefaultTopK', DEFAULT_MEMORY_CONFIG.ltmDefaultTopK, 1, 20),
    minSimilarity: parseNumber('minSimilarity', DEFAULT_MEMORY_CONFIG.minSimilarity, 0.3, 0.95),
    autoExtractFacts: parseBoolean('autoExtractFacts', DEFAULT_MEMORY_CONFIG.autoExtractFacts),
    enableCanonValidation: parseBoolean('enableCanonValidation', DEFAULT_MEMORY_CONFIG.enableCanonValidation),
    ltmMaxEntries: parseNumber('ltmMaxEntries', DEFAULT_MEMORY_CONFIG.ltmMaxEntries, 100, 50000),
    summaryMaxRetries: parseNumber('summaryMaxRetries', DEFAULT_MEMORY_CONFIG.summaryMaxRetries, 0, 5),
    summaryRetryDelayMs: parseNumber('summaryRetryDelayMs', DEFAULT_MEMORY_CONFIG.summaryRetryDelayMs, 1000, 30000)
  };
};

export const buildPastMemoryBlock = (block: MemoryContextBlock): string => {
  const lines: string[] = [];
  if (block.summary) {
    lines.push('\u3010Current Summary\u3011');
    lines.push(block.summary.summary);
    if (block.summary.mood) lines.push(`\u60C5\u7DD2\uFF1A${block.summary.mood}`);
    if (block.summary.goals?.length) lines.push(`\u76EE\u6A19\uFF1A${block.summary.goals.join('\u3001')}`);
    lines.push('');
  }
  if (block.memories.length > 0) {
    lines.push('[Past Memory]');
    block.memories.forEach((memory) => {
      lines.push(`- ${memory.content}`);
    });
  }
  return lines.join('\n').trim();
};

export const formatSummaryContext = (summary?: EpisodeSummary | null): string => {
  if (!summary) return '';
  const lines: string[] = ['\u3010Current Summary\u3011', summary.summary];
  if (summary.mood) lines.push(`\u60C5\u7DD2\uFF1A${summary.mood}`);
  if (summary.goals?.length) lines.push(`\u76EE\u6A19\uFF1A${summary.goals.join('\u3001')}`);
  return lines.join('\n').trim();
};

export const formatStmContext = (turns: ShortTermMemory[]): string => {
  if (turns.length === 0) return '';
  const lines = ['\u3010Recent Turns\u3011'];
  turns.forEach((turn) => {
    const roleLabel = turn.role === 'user' ? '\u73A9\u5BB6' : turn.role === 'assistant' ? '\u89D2\u8272' : '\u65C1\u89C0';
    lines.push(`${roleLabel}\uFF1A${turn.content}`);
  });
  return lines.join('\n').trim();
};

export const formatLtmContext = (memories: SemanticMemory[]): string => {
  if (memories.length === 0) return '';
  const lines = ['[Past Memory]'];
  memories.forEach((memory) => {
    lines.push(`- ${memory.content}`);
  });
  return lines.join('\n').trim();
};

export const formatSharedMemoryContext = (memories: SemanticMemory[]): string => {
  if (memories.length === 0) return '';
  const lines = ['[Shared Memory]'];
  memories.forEach((memory) => {
    lines.push(`- ${memory.content}`);
  });
  return lines.join('\n').trim();
};

export const formatFactsContext = (facts: MemoryFact[]): string => {
  if (facts.length === 0) return '';
  const lines = ['\u3010Facts\u3011'];
  facts.forEach((fact) => {
    lines.push(`- ${fact.key}: ${fact.value}`);
  });
  return lines.join('\n').trim();
};

export const formatMemoryContextPayload = (context: MemoryContext): string => {
  const blocks = [context.mtm, context.stm, context.ltm, context.facts].filter((block) => block && block.trim().length > 0);
  return blocks.join('\n\n').trim();
};

export const formatMemoryContext = (summary: MemoryContextBlock['summary'], memories: SemanticMemory[]): string => {
  if (!summary && memories.length === 0) return '';
  return buildPastMemoryBlock({ summary, memories });
};
