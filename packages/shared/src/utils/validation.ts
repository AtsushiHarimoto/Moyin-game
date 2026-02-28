/**
 * Validation utilities.
 *
 * Pure functions with zero framework or library dependencies.
 * These cover ID pattern checks and SVG content sanitisation.
 */

import type { IconValidationResult } from '../types/common.js';

// ---------------------------------------------------------------------------
// ID pattern
// ---------------------------------------------------------------------------

/** Regex for valid entity IDs: alphanumeric, dots, hyphens, underscores. */
export const ID_PATTERN = /^[A-Za-z0-9._-]+$/;

/** Check whether a string is a valid entity ID. */
export function isValidEntityId(value: string): boolean {
  return ID_PATTERN.test(value);
}

// ---------------------------------------------------------------------------
// SVG content validation
// ---------------------------------------------------------------------------

const UNSAFE_TAG_PATTERN = /<(script|foreignObject|iframe|object|embed)[\s>]/i;
const UNSAFE_ATTR_PATTERN = /\son\w+=/i;
const EXTERNAL_HREF_PATTERN = /\b(xlink:href|href)=["'](http|https|javascript:|data:)/i;

/** @deprecated Use `IconValidationResult` from `../types/common.js` instead. */
export type SvgValidationResult = IconValidationResult;

/**
 * Validate SVG content for potentially dangerous elements.
 *
 * Checks for:
 * - Unsafe tags (`<script>`, `<iframe>`, etc.)
 * - Inline event handlers (`onclick`, `onerror`, etc.)
 * - External/protocol references (`javascript:`, `data:`, remote URLs)
 * - Missing `<svg>` root element
 */
export function validateSvgContent(svgText: string): IconValidationResult {
  const errors: string[] = [];

  if (!svgText || typeof svgText !== 'string') {
    return { valid: false, errors: ['Empty SVG content.'] };
  }

  if (UNSAFE_TAG_PATTERN.test(svgText)) {
    errors.push('Unsafe tag detected.');
  }

  if (UNSAFE_ATTR_PATTERN.test(svgText)) {
    errors.push('Inline event handler detected.');
  }

  if (EXTERNAL_HREF_PATTERN.test(svgText)) {
    errors.push('External reference detected.');
  }

  if (!/<svg[\s>]/i.test(svgText)) {
    errors.push('Missing <svg> root element.');
  }

  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Story-pack constants (used by the story validator)
// ---------------------------------------------------------------------------

export const SUPPORTED_SCHEMA_VERSIONS = new Set(['1']);
export const EXPECTED_PROTOCOL_PIN = '1';
export const ALLOWED_EVENT_KINDS = new Set(['byFlag', 'byChoice', 'byChip', 'byLLMSignal']);
export const ALLOWED_ENDING_TYPES = new Set(['bad', 'normal', 'good', 'true']);
export const ALLOWED_ASSET_TYPES = new Set(['bg', 'portrait', 'avatar', 'bgm', 'sfx', 'other']);
