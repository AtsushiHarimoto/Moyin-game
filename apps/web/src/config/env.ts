/**
 * Environment Configuration
 * Purpose: Centralised access to all Vite environment variables
 * with type-safe parsing and sensible defaults.
 */

type EnvMap = Record<string, string | boolean | undefined>;
export type NetMode = 'mock' | 'real';
export type GemOption = { id: string; label: string };

const env = ((globalThis as Record<string, unknown>).__VITE_ENV__ ?? import.meta.env) as EnvMap;

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

function readEnv(key: string, fallback = ''): string {
  const value = env[key];
  if (value === undefined || value === null) return fallback;
  return String(value);
}

export function parseBoolean(value: string | boolean | undefined, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return fallback;
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false;
  return fallback;
}

export function parseNumber(value: string | boolean | undefined, fallback: number): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (typeof value === 'boolean') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function parseNetMode(value: string): NetMode {
  return value === 'mock' ? 'mock' : 'real';
}

export function parseGemList(value: string): GemOption[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      console.warn('[env] GEM_LIST JSON must be an array.');
      return [];
    }
    return parsed
      .map((item: unknown) => {
        if (typeof item === 'string') {
          return { id: item, label: item };
        }
        if (item && typeof item === 'object') {
          const candidate = item as { id?: string; value?: string; label?: string };
          const id = String(candidate.id ?? candidate.value ?? '');
          if (!id) return null;
          const label = String(candidate.label ?? id);
          return { id, label };
        }
        return null;
      })
      .filter((item): item is GemOption => Boolean(item));
  } catch (error) {
    console.warn('[env] Invalid GEM_LIST JSON.', error);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Exported constants
// ---------------------------------------------------------------------------

// Core
export const IS_DEV: boolean = Boolean(env.DEV);
export const API_BASE_URL: string = readEnv('VITE_API_BASE_URL', '/api');
export const API_KEY_DEFAULT: string = readEnv('VITE_API_KEY', '');

// Feature flags
export const DISABLE_ANIMATIONS: boolean = parseBoolean(env.VITE_DISABLE_ANIMATIONS, false);
export const IS_DB_RESET_ON_START: boolean = parseBoolean(env.VITE_DB_RESET_ON_START, false);

// Mock flags
export const IS_MOCK_LLM: boolean = parseBoolean(env.VITE_MOCK_LLM ?? env.VITE_IS_MOCK_LLM, false);
export const IS_MOCK_VN_STAGE: boolean = parseBoolean(
  env.VITE_MOCK_VN_STAGE ?? env.VITE_IS_MOCK_VN_STAGE,
  false,
);

// G4 Memory
export const IS_G4_MEMORY_ENABLED: boolean = parseBoolean(env.VITE_G4_MEMORY_ENABLED, false);
export const G4_MEMORY_VECTOR_DIM: number = parseNumber(env.VITE_G4_MEMORY_VECTOR_DIM, 1024);
export const IS_G4_MEMORY_REMOTE: boolean = parseBoolean(env.VITE_G4_MEMORY_REMOTE, false);
export const G4_MEMORY_BASE_URL: string = readEnv(
  'VITE_G4_MEMORY_BASE_URL',
  readEnv('VITE_MCP_BASE_URL', 'http://127.0.0.1:8100'),
);
export const G4_MEMORY_TIMEOUT_MS: number = parseNumber(env.VITE_G4_MEMORY_TIMEOUT_MS, 12000);

// Network mode
export const NET_MODE: NetMode = parseNetMode(readEnv('VITE_NET_MODE', 'real'));
export const IS_NET_MOCK: boolean = parseBoolean(env.VITE_NET_MOCK, NET_MODE === 'mock');

// Trace
export const IS_VN_TRACE_ENABLED: boolean = parseBoolean(env.VITE_VN_TRACE_ENABLED, IS_DEV);
export const IS_VN_TRACE_PERSIST: boolean = parseBoolean(env.VITE_VN_TRACE_PERSIST, false);

// API keys
export const GEMINI_API_KEY: string = readEnv('VITE_GEMINI_API_KEY', readEnv('VITE_API_KEY', ''));
export const GROK_API_KEY: string = readEnv('VITE_GROK_API_KEY', readEnv('VITE_API_KEY', ''));
export const OLLAMA_BASE_URL: string = readEnv('VITE_OLLAMA_BASE_URL', '');

// Gem list
export const GEM_LIST: GemOption[] = parseGemList(readEnv('VITE_GEM_LIST', ''));
