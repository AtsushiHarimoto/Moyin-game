/**
 * Story Import Store (Zustand)
 * Manages the story JSON file import flow (select file -> validate -> confirm).
 *
 * Design pattern: State machine (Step 1 -> Step 2 -> Step 3)
 * Flow: Select file -> Validate/Preview -> Confirm import (via Workshop)
 */
import { create } from 'zustand'
import { useStoryWorkshopStore } from '../../story-workshop/stores/useStoryWorkshopStore'
import { usePackRegistryStore } from './usePackRegistryStore'

/* ========================================
 * Types
 * ======================================== */

export interface ValidationItem {
  id: string
  message: string
  type: 'error' | 'warning'
}

export interface StoryPreviewSummary {
  title?: string
  storyKey?: string
  packVersion?: string
  sceneCount?: number
  chapterCount?: number
  characterCount?: number
  description?: string
}

interface StoryImportState {
  /** Current step: 1=select file, 2=validate/preview, 3=flow canvas */
  step: 1 | 2 | 3
  /** Selected file object */
  file: File | null
  /** Raw text content from file */
  rawText: string | null
  /** Parsed JSON object */
  parsedJson: Record<string, unknown> | null
  /** Validation errors (block import) */
  errors: ValidationItem[]
  /** Validation warnings (non-blocking) */
  warnings: ValidationItem[]
  /** Whether file is being parsed */
  isParsing: boolean
  /** Import result status */
  importResult: 'idle' | 'success' | 'failed'
}

interface StoryImportActions {
  /** Reset all import state */
  reset: () => void
  /** Select and process a file */
  selectFile: (file: File) => Promise<void>
  /** Validate and parse the raw text */
  validateAndParse: () => void
  /** Confirm import (send to Workshop Store) */
  confirmImport: () => Promise<void>
  /** Set the step directly */
  setStep: (step: 1 | 2 | 3) => void
  /** Set parsedJson directly (e.g. from flow canvas edits) */
  setParsedJson: (json: Record<string, unknown>) => void
}

/* ========================================
 * Computed Getters (derived from state)
 * ======================================== */

export function selectCanConfirm(state: StoryImportState): boolean {
  return state.step === 2 && state.errors.length === 0 && !!state.parsedJson
}

export function selectNormalizedMeta(
  state: StoryImportState,
): Record<string, unknown> {
  if (!state.parsedJson) return {}
  return (
    (state.parsedJson.manifest as Record<string, unknown>) ?? state.parsedJson
  )
}

export function selectPreviewSummary(
  state: StoryImportState,
): StoryPreviewSummary | null {
  return buildPreviewSummaryFromJson(state.parsedJson)
}

/* ========================================
 * Validation helpers
 * ======================================== */

/**
 * Validate a parsed story JSON structure.
 * Returns errors and warnings.
 */
function validateStoryJson(
  json: Record<string, unknown>,
  checkDuplicates: boolean,
): { errors: ValidationItem[]; warnings: ValidationItem[] } {
  const errors: ValidationItem[] = []
  const warnings: ValidationItem[] = []

  // Basic structure checks
  const manifest = json.manifest as Record<string, unknown> | undefined
  const storyKey =
    (manifest?.storyKey as string) ?? (json.storyKey as string) ?? ''
  const packVersion =
    (manifest?.packVersion as string) ??
    (manifest?.version as string) ??
    (json.packVersion as string) ??
    ''

  if (!storyKey) {
    errors.push({
      id: 'MISSING_STORY_KEY',
      message: 'Missing required field: storyKey',
      type: 'error',
    })
  }

  if (!packVersion) {
    warnings.push({
      id: 'MISSING_VERSION',
      message: 'Missing packVersion, defaulting to 1.0.0',
      type: 'warning',
    })
  }

  // Check scenes
  const scenes = json.scenes as unknown[] | undefined
  if (!scenes || !Array.isArray(scenes) || scenes.length === 0) {
    warnings.push({
      id: 'NO_SCENES',
      message: 'No scenes found in story pack',
      type: 'warning',
    })
  }

  // Check characters
  const characters = json.characters as unknown[] | undefined
  if (!characters || !Array.isArray(characters) || characters.length === 0) {
    warnings.push({
      id: 'NO_CHARACTERS',
      message: 'No characters found in story pack',
      type: 'warning',
    })
  }

  // Check duplicates
  if (checkDuplicates && storyKey && packVersion) {
    const registry = usePackRegistryStore.getState()
    if (registry.existsSync(storyKey, packVersion)) {
      warnings.push({
        id: 'DUPLICATE_PACK',
        message: `Story pack "${storyKey}@${packVersion}" already exists and will be overwritten`,
        type: 'warning',
      })
    }
  }

  return { errors, warnings }
}

/**
 * Generate preview summary from parsed JSON.
 */
export function buildPreviewSummaryFromJson(
  json: Record<string, unknown> | null,
): StoryPreviewSummary | null {
  if (!json) return null

  const manifest = json.manifest as Record<string, unknown> | undefined

  return {
    title:
      (manifest?.title as string) ?? (json.title as string) ?? 'Untitled',
    storyKey:
      (manifest?.storyKey as string) ?? (json.storyKey as string) ?? '',
    packVersion:
      (manifest?.packVersion as string) ??
      (manifest?.version as string) ??
      (json.packVersion as string) ??
      '1.0.0',
    sceneCount: Array.isArray(json.scenes) ? json.scenes.length : 0,
    chapterCount: Array.isArray(json.chapters) ? json.chapters.length : 0,
    characterCount: Array.isArray(json.characters)
      ? json.characters.length
      : 0,
    description:
      (manifest?.description as string) ??
      (json.description as string) ??
      '',
  }
}

/* ========================================
 * Initial state
 * ======================================== */

const initialState: StoryImportState = {
  step: 1,
  file: null,
  rawText: null,
  parsedJson: null,
  errors: [],
  warnings: [],
  isParsing: false,
  importResult: 'idle',
}

/* ========================================
 * Store
 * ======================================== */

export const useStoryImportStore = create<StoryImportState & StoryImportActions>()(
  (set, get) => ({
    ...initialState,

    reset() {
      set(initialState)
    },

    async selectFile(file: File) {
      set({ ...initialState, file, isParsing: true })

      try {
        const text = await file.text()
        set({ rawText: text })

        // Parse and validate
        get().validateAndParse()
      } catch (e) {
        set((s) => ({
          errors: [
            ...s.errors,
            {
              id: 'FILE_READ_ERROR',
              message: (e as Error).message,
              type: 'error' as const,
            },
          ],
        }))
      } finally {
        set({ isParsing: false, step: 2 })
      }
    },

    validateAndParse() {
      const { rawText } = get()
      let parsedJson: Record<string, unknown> | null = null

      // 1. Parse JSON
      try {
        parsedJson = JSON.parse(rawText || '')
      } catch {
        set({
          parsedJson: null,
          errors: [
            {
              id: 'PACK_JSON_PARSE_ERROR',
              message: 'Invalid JSON format.',
              type: 'error',
            },
          ],
          warnings: [],
        })
        return
      }

      // 2. Structural validation (check duplicates = true for new imports)
      const result = validateStoryJson(parsedJson!, true)
      set({
        parsedJson,
        errors: result.errors,
        warnings: result.warnings,
      })
    },

    async confirmImport() {
      const state = get()
      if (!selectCanConfirm(state)) return

      // Fill Workshop Store for review
      const workshop = useStoryWorkshopStore.getState()
      if (state.rawText) {
        workshop.loadText(state.rawText)
        workshop.setPendingImport(true)
      }

      set({ importResult: 'success' })
    },

    setStep(step) {
      set({ step })
    },

    setParsedJson(json) {
      set({ parsedJson: json })
    },
  }),
)
