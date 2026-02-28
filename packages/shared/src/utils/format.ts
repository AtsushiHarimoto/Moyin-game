/**
 * Formatting utilities.
 *
 * Pure functions with zero framework dependencies. These helpers
 * cover common data-shape transformations used across the engine.
 */

import type { StoryPreviewSummary } from '../types/common.js';

// ---------------------------------------------------------------------------
// Array / object helpers
// ---------------------------------------------------------------------------

/**
 * Coerce an unknown value into a flat array.
 *
 * - `null` / `undefined` -> `[]`
 * - Already an array -> returned as-is
 * - Plain object -> `Object.values()`
 * - Anything else -> `[]`
 */
export function flattenArray(value: unknown): unknown[] {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'object') return Object.values(value);
  return [];
}

/**
 * Extract an array of strings from an unknown value.
 *
 * - `null` / `undefined` -> `[]`
 * - A single string -> `[string]`
 * - An array -> filtered to strings only
 */
export function collectStrings(value: unknown): string[] {
  if (!value) return [];
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  return [];
}

// ---------------------------------------------------------------------------
// Type narrowing helpers
// ---------------------------------------------------------------------------

/** Check whether a value is an array of numbers. */
export function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'number');
}

// ---------------------------------------------------------------------------
// Entity entry builder (for validation pipelines)
// ---------------------------------------------------------------------------

/** A normalised entity entry used during validation. */
export type EntityEntry = {
  id: string;
  item: Record<string, unknown>;
  path: string;
};

/**
 * Build a normalised array of `EntityEntry` from either an array or
 * a keyed object.
 *
 * @param source      - The raw data (array or object).
 * @param idField     - Name of the field that holds the entity's ID.
 * @param contextPath - Base path string for error reporting.
 */
export function buildEntries(
  source: unknown,
  idField: string,
  contextPath: string,
): EntityEntry[] {
  if (!source) return [];

  if (Array.isArray(source)) {
    return source.map((item: Record<string, unknown>, index: number) => ({
      id: typeof item?.[idField] === 'string' ? (item[idField] as string) : '',
      item: item as Record<string, unknown>,
      path: `${contextPath}[${index}]`,
    }));
  }

  if (typeof source === 'object' && source !== null) {
    return Object.entries(source).map(([key, value]) => ({
      id:
        typeof (value as Record<string, unknown>)?.[idField] === 'string'
          ? ((value as Record<string, unknown>)[idField] as string)
          : key,
      item: value as Record<string, unknown>,
      path: `${contextPath}{${key}}`,
    }));
  }

  return [];
}

// ---------------------------------------------------------------------------
// Preview summary builder
// ---------------------------------------------------------------------------

/**
 * Derive a preview summary from a raw (parsed) story-pack object.
 *
 * Returns `null` when `parsedJson` is falsy.
 */
export function getPreviewSummary(
  parsedJson: Record<string, unknown> | null,
): StoryPreviewSummary | null {
  if (!parsedJson) return null;

  const meta = (parsedJson.manifest ?? parsedJson) as Record<string, unknown>;

  function countEntries(field: unknown): number {
    if (!field) return 0;
    if (Array.isArray(field)) return field.length;
    if (typeof field === 'object' && field !== null) return Object.keys(field).length;
    return 0;
  }

  return {
    title: (meta.title as string) || 'Untitled',
    storyKey: (meta.storyKey as string) || 'unknown',
    packVersion: (meta.packVersion as string) || '0.0.0',
    sceneCount: countEntries(parsedJson.scenes),
    chapterCount: countEntries(parsedJson.chapters),
    characterCount: countEntries(parsedJson.characters),
    description: (meta.description as string) || '',
  };
}
