import {
  useStoryWorkshopStore,
  selectIsDirty,
  selectCanConfirm,
  selectHasContent,
  selectNormalizedMeta,
} from '@/features/story-workshop/stores/useStoryWorkshopStore'
import type { WorkshopState } from '@/features/story-workshop/stores/useStoryWorkshopStore'

const VALID_STORY = JSON.stringify({
  storyKey: 'test',
  title: 'Test Story',
  scenes: [{ id: 's1' }],
  characters: [{ id: 'c1' }],
})

const MISSING_KEY_STORY = JSON.stringify({
  title: 'No Key',
  scenes: [{ id: 's1' }],
  characters: [{ id: 'c1' }],
})

function makeState(overrides: Partial<WorkshopState> = {}): WorkshopState {
  return {
    sourceText: '',
    editorDraft: '',
    parsedJson: null,
    preview: null,
    errors: [],
    warnings: [],
    parseError: null,
    pendingImport: false,
    ...overrides,
  } as WorkshopState
}

beforeEach(() => {
  useStoryWorkshopStore.getState().reset()
})

// ---------------------------------------------------------------------------
// Selectors (pure functions)
// ---------------------------------------------------------------------------
describe('selectIsDirty', () => {
  it('returns false when editorDraft equals sourceText', () => {
    const state = makeState({ sourceText: 'abc', editorDraft: 'abc' })
    expect(selectIsDirty(state)).toBe(false)
  })

  it('returns true when editorDraft differs from sourceText', () => {
    const state = makeState({ sourceText: 'abc', editorDraft: 'xyz' })
    expect(selectIsDirty(state)).toBe(true)
  })
})

describe('selectCanConfirm', () => {
  it('returns true when no errors and no parseError', () => {
    const state = makeState()
    expect(selectCanConfirm(state)).toBe(true)
  })

  it('returns false when errors array is non-empty', () => {
    const state = makeState({ errors: [{ id: 'MISSING_STORY_KEY', message: 'Missing required field: storyKey', type: 'error' }] })
    expect(selectCanConfirm(state)).toBe(false)
  })

  it('returns false when parseError is set', () => {
    const state = makeState({ parseError: 'Unexpected token' })
    expect(selectCanConfirm(state)).toBe(false)
  })
})

describe('selectHasContent', () => {
  it('returns false when sourceText is empty', () => {
    expect(selectHasContent(makeState())).toBe(false)
  })

  it('returns true when sourceText has content', () => {
    expect(selectHasContent(makeState({ sourceText: VALID_STORY }))).toBe(true)
  })
})

describe('selectNormalizedMeta', () => {
  it('returns empty object when parsedJson is null', () => {
    expect(selectNormalizedMeta(makeState())).toEqual({})
  })

  it('returns manifest when parsedJson has manifest', () => {
    const manifest = { storyKey: 'test', title: 'Test' }
    const state = makeState({
      parsedJson: { manifest } as unknown as Record<string, unknown>,
    })
    expect(selectNormalizedMeta(state)).toEqual(manifest)
  })

  it('returns root parsedJson when no manifest present', () => {
    const root = { storyKey: 'test', title: 'Test' }
    const state = makeState({ parsedJson: root })
    expect(selectNormalizedMeta(state)).toEqual(root)
  })
})

// ---------------------------------------------------------------------------
// Store actions
// ---------------------------------------------------------------------------
describe('loadText', () => {
  it('sets sourceText and editorDraft, then triggers applyDraft', () => {
    useStoryWorkshopStore.getState().loadText(VALID_STORY)
    const s = useStoryWorkshopStore.getState()

    expect(s.sourceText).toBe(VALID_STORY)
    expect(s.editorDraft).toBe(VALID_STORY)
    expect(s.parsedJson).not.toBeNull()
    expect(s.parseError).toBeNull()
  })
})

describe('updateDraft', () => {
  it('only updates editorDraft, not sourceText', () => {
    useStoryWorkshopStore.getState().loadText(VALID_STORY)
    useStoryWorkshopStore.getState().updateDraft('changed')
    const s = useStoryWorkshopStore.getState()

    expect(s.editorDraft).toBe('changed')
    expect(s.sourceText).toBe(VALID_STORY)
  })
})

describe('revertDraft', () => {
  it('reverts editorDraft back to sourceText', () => {
    useStoryWorkshopStore.getState().loadText(VALID_STORY)
    useStoryWorkshopStore.getState().updateDraft('modified')
    useStoryWorkshopStore.getState().revertDraft()

    expect(useStoryWorkshopStore.getState().editorDraft).toBe(VALID_STORY)
  })
})

describe('applyDraft', () => {
  it('parses valid JSON with storyKey — sets parsedJson, no errors', () => {
    useStoryWorkshopStore.getState().updateDraft(VALID_STORY)
    useStoryWorkshopStore.getState().applyDraft()
    const s = useStoryWorkshopStore.getState()

    expect(s.parsedJson).not.toBeNull()
    expect(s.parsedJson?.storyKey).toBe('test')
    expect(s.errors).toHaveLength(0)
    expect(s.parseError).toBeNull()
  })

  it('sets parseError for invalid JSON', () => {
    useStoryWorkshopStore.getState().updateDraft('{not valid json}')
    useStoryWorkshopStore.getState().applyDraft()
    const s = useStoryWorkshopStore.getState()

    expect(s.parseError).toBeTruthy()
    expect(s.parsedJson).toBeNull()
  })

  it('reports MISSING_STORY_KEY error when storyKey is absent', () => {
    useStoryWorkshopStore.getState().updateDraft(MISSING_KEY_STORY)
    useStoryWorkshopStore.getState().applyDraft()
    const s = useStoryWorkshopStore.getState()

    expect(s.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'MISSING_STORY_KEY' })]),
    )
    expect(s.parsedJson).not.toBeNull()
  })

  it('handles empty/whitespace text — clears everything, no parseError', () => {
    // First load valid data so there is state to clear
    useStoryWorkshopStore.getState().loadText(VALID_STORY)
    // Now set draft to whitespace and apply
    useStoryWorkshopStore.getState().updateDraft('   ')
    useStoryWorkshopStore.getState().applyDraft()
    const s = useStoryWorkshopStore.getState()

    expect(s.parsedJson).toBeNull()
    expect(s.parseError).toBeNull()
    expect(s.errors).toHaveLength(0)
    expect(s.preview).toBeNull()
  })
})

describe('reset', () => {
  it('restores initial state after modifications', () => {
    useStoryWorkshopStore.getState().loadText(VALID_STORY)
    useStoryWorkshopStore.getState().reset()
    const s = useStoryWorkshopStore.getState()

    expect(s.sourceText).toBe('')
    expect(s.editorDraft).toBe('')
    expect(s.parsedJson).toBeNull()
    expect(s.preview).toBeNull()
    expect(s.errors).toHaveLength(0)
    expect(s.warnings).toHaveLength(0)
    expect(s.parseError).toBeNull()
    expect(s.pendingImport).toBe(false)
  })
})
