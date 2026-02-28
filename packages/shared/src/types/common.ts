/**
 * Common utility types used across the Moyin visual novel engine.
 *
 * Covers: ID patterns, timestamps, locale, validation results,
 * and shared structural helpers.
 */

// ---------------------------------------------------------------------------
// ID & timestamp primitives
// ---------------------------------------------------------------------------

/** Branded string for entity IDs that follow the `[A-Za-z0-9._-]+` pattern. */
export type EntityId = string & { readonly __brand: 'EntityId' };

/** ISO-8601 timestamp string (e.g. `2025-01-01T00:00:00.000Z`). */
export type ISOTimestamp = string & { readonly __brand: 'ISOTimestamp' };

/** Supported locale codes for multi-language prompts. */
export type Locale = string & { readonly __brand: 'Locale' };

// ---------------------------------------------------------------------------
// Branded type factory helpers
// ---------------------------------------------------------------------------

/** Create a branded EntityId from a plain string. */
export function entityId(id: string): EntityId {
  return id as EntityId;
}

/** Create a branded ISOTimestamp from a plain string. */
export function isoTimestamp(ts: string): ISOTimestamp {
  return ts as ISOTimestamp;
}

/** Create a branded Locale from a plain string. */
export function locale(loc: string): Locale {
  return loc as Locale;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** Outcome of a generic validation operation. */
export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

/**
 * A single validation finding (error or warning) with contextual metadata.
 *
 * Used by the story-pack validator to report structural issues.
 */
export interface ValidationItem {
  /** Machine-readable identifier, e.g. `PACK_JSON_PARSE_ERROR`. */
  id: string;
  /** Human-readable description of the issue. */
  message: string;
  /** Severity level. */
  type: 'error' | 'warning';
  /** JSON-path-like location of the issue. */
  path?: string;
  /** Optional remediation hint. */
  hint?: string;
}

/** Aggregated validation report for a story pack. */
export interface ValidationReport {
  generatedAt: ISOTimestamp;
  storyKey?: string;
  packVersion?: string;
  mapping: {
    bySignalMapped: number;
    initialRelationsABMapped: number;
    playerIdDefaulted: number;
    anchorsDeprecated: number;
  };
  warnings: ValidationItem[];
  errors: ValidationItem[];
}

// ---------------------------------------------------------------------------
// Icon system
// ---------------------------------------------------------------------------

/** A single theme variant for an icon entry. */
export type IconThemeVariant = {
  theme: string;
  svgPath: string;
};

/** Theme variants can be an array of variant objects or a `theme -> path` map. */
export type IconThemeVariants = IconThemeVariant[] | Record<string, string>;

/** Describes a single icon in the registry. */
export type IconEntry = {
  id: string;
  name: string;
  category: string;
  tags: string[];
  svgPath: string;
  themeVariants?: IconThemeVariants;
};

/** Full icon registry payload. */
export type IconRegistry = {
  version: string;
  updatedAt: string;
  themes: string[];
  categories: string[];
  icons: IconEntry[];
};

/** Result of validating SVG content for safety. */
export type IconValidationResult = {
  valid: boolean;
  errors: string[];
};

// ---------------------------------------------------------------------------
// Story preview summary
// ---------------------------------------------------------------------------

/** Quick-look summary derived from a story pack. */
export interface StoryPreviewSummary {
  title: string;
  storyKey: string;
  packVersion: string;
  sceneCount: number;
  chapterCount: number;
  characterCount: number;
  description: string;
}
