/**
 * Story Workshop Store (Zustand)
 * Manages online editing, validation, and saving of story packs.
 * Design: Editor state pattern (sourceText vs editorDraft)
 */
import { create } from 'zustand'
import { usePackRegistryStore } from '../../story-import/stores/usePackRegistryStore'

// --- Types ---

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

export interface WorkshopState {
  sourceText: string
  editorDraft: string
  parsedJson: Record<string, unknown> | null
  preview: StoryPreviewSummary | null
  errors: ValidationItem[]
  warnings: ValidationItem[]
  parseError: string | null
  pendingImport: boolean
}

interface WorkshopActions {
  loadText: (text: string) => void
  updateDraft: (text: string) => void
  revertDraft: () => void
  downloadDraft: () => void
  applyDraft: (commitAsSource?: boolean) => void
  saveToRegistry: () => Promise<boolean>
  reset: () => void
  setPendingImport: (value: boolean) => void
}

// --- Derived selectors ---

export function selectIsDirty(state: WorkshopState): boolean {
  return state.editorDraft !== state.sourceText
}

export function selectCanConfirm(state: WorkshopState): boolean {
  return !state.parseError && state.errors.length === 0
}

export function selectHasContent(state: WorkshopState): boolean {
  return !!state.sourceText
}

export function selectNormalizedMeta(
  state: WorkshopState,
): Record<string, unknown> {
  if (!state.parsedJson) return {}
  return (
    (state.parsedJson.manifest as Record<string, unknown>) ?? state.parsedJson
  )
}

// --- Validation helpers ---

function validateStoryJson(
  json: Record<string, unknown>,
): { errors: ValidationItem[]; warnings: ValidationItem[] } {
  const errors: ValidationItem[] = []
  const warnings: ValidationItem[] = []

  const manifest = json.manifest as Record<string, unknown> | undefined
  const storyKey =
    (manifest?.storyKey as string) ?? (json.storyKey as string) ?? ''

  if (!storyKey) {
    errors.push({
      id: 'MISSING_STORY_KEY',
      message: 'Missing required field: storyKey',
      type: 'error',
    })
  }

  if (!Array.isArray(json.scenes) || json.scenes.length === 0) {
    warnings.push({
      id: 'NO_SCENES',
      message: 'No scenes found in story pack',
      type: 'warning',
    })
  }

  if (!Array.isArray(json.characters) || json.characters.length === 0) {
    warnings.push({
      id: 'NO_CHARACTERS',
      message: 'No characters found in story pack',
      type: 'warning',
    })
  }

  return { errors, warnings }
}

function getPreviewSummary(
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

// --- Initial state ---

const initialState: WorkshopState = {
  sourceText: '',
  editorDraft: '',
  parsedJson: null,
  preview: null,
  errors: [],
  warnings: [],
  parseError: null,
  pendingImport: false,
}

// --- Store ---

export const useStoryWorkshopStore = create<WorkshopState & WorkshopActions>()(
  (set, get) => ({
    ...initialState,

    loadText(text: string) {
      set({ sourceText: text, editorDraft: text })
      get().applyDraft(true)
    },

    updateDraft(text: string) {
      set({ editorDraft: text })
    },

    revertDraft() {
      set((s) => ({ editorDraft: s.sourceText }))
    },

    downloadDraft() {
      const { editorDraft, preview } = get()
      const blob = new Blob([editorDraft], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download =
        preview?.storyKey ? `${preview.storyKey}.json` : `story-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
    },

    applyDraft(commitAsSource = false) {
      const { editorDraft } = get()

      set({
        errors: [],
        warnings: [],
        parseError: null,
        parsedJson: null,
        preview: null,
      })

      if (!editorDraft.trim()) return

      let parsedJson: Record<string, unknown>
      try {
        parsedJson = JSON.parse(editorDraft)
      } catch (e) {
        set({ parseError: (e as Error).message })
        return
      }

      const result = validateStoryJson(parsedJson)
      const preview = getPreviewSummary(parsedJson)
      const canConfirm = result.errors.length === 0

      set({
        parsedJson,
        errors: result.errors,
        warnings: result.warnings,
        preview,
        ...(commitAsSource && canConfirm ? { sourceText: editorDraft } : {}),
      })
    },

    async saveToRegistry(): Promise<boolean> {
      const state = get()
      if (!selectCanConfirm(state)) {
        console.error('[Workshop] Cannot save: validation failed')
        return false
      }
      if (!state.parsedJson) {
        console.error('[Workshop] Cannot save: no parsed JSON')
        return false
      }

      const registry = usePackRegistryStore.getState()
      const meta = selectNormalizedMeta(state)

      // Deep clone to remove any proxies
      const safePayload = JSON.parse(JSON.stringify(state.parsedJson))

      await registry.commit({
        storyKey: meta.storyKey as string,
        packVersion: (meta.packVersion as string) || '1.0.0',
        schemaVersion: (meta.schemaVersion as string) || '1.0',
        importedAt: Date.now(),
        status: 'valid',
        payload: safePayload,
        title: meta.title as string | undefined,
      })

      console.log(
        '[Workshop] saveToRegistry done, packs:',
        registry.packs.length,
      )

      set({ sourceText: state.editorDraft })
      return true
    },

    reset() {
      set(initialState)
    },

    setPendingImport(value: boolean) {
      set({ pendingImport: value })
    },
  }),
)
