import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { renderWithProviders } from '../helpers/renderWithProviders'
import { WorkshopEditor } from '@/features/story-workshop/components/WorkshopEditor'
import { useStoryWorkshopStore } from '@/features/story-workshop/stores/useStoryWorkshopStore'

const VALID_JSON = {
  manifest: { storyKey: 'test-story', title: 'Test Story', packVersion: '1.0.0' },
  scenes: [{ id: 'scene1', background: 'school' }],
  characters: [{ id: 'char1', name: 'Alice' }],
}

const VALID_JSON_TEXT = JSON.stringify(VALID_JSON)

describe('WorkshopEditor', () => {
  beforeEach(() => {
    useStoryWorkshopStore.getState().reset()
  })

  // ---------- Render after loading valid JSON ----------

  it('displays JSON text in textarea and title in TopBar after loadText', () => {
    useStoryWorkshopStore.getState().loadText(VALID_JSON_TEXT)
    renderWithProviders(<WorkshopEditor onClose={vi.fn()} />)

    const textarea = screen.getByTestId('workshop-editor-textarea') as HTMLTextAreaElement
    expect(textarea.value).toBe(VALID_JSON_TEXT)

    const topbar = screen.getByTestId('workshop-topbar')
    expect(within(topbar).getByText('Test Story')).toBeInTheDocument()
  })

  // ---------- Edit textarea ----------

  it('updates editorDraft in store when textarea is edited', async () => {
    const user = userEvent.setup()
    useStoryWorkshopStore.getState().loadText(VALID_JSON_TEXT)
    renderWithProviders(<WorkshopEditor onClose={vi.fn()} />)

    const textarea = screen.getByTestId('workshop-editor-textarea') as HTMLTextAreaElement
    await user.clear(textarea)
    await user.type(textarea, 'hello')

    expect(useStoryWorkshopStore.getState().editorDraft).toBe('hello')
  })

  // ---------- Apply button ----------

  it('applies draft and updates parsedJson when Apply is clicked', async () => {
    const user = userEvent.setup()
    // Load initial text, then modify to make dirty
    useStoryWorkshopStore.getState().loadText('{}')
    useStoryWorkshopStore.getState().updateDraft(VALID_JSON_TEXT)
    renderWithProviders(<WorkshopEditor onClose={vi.fn()} />)

    const applyBtn = screen.getByText('Apply')
    await user.click(applyBtn)

    expect(useStoryWorkshopStore.getState().parsedJson).not.toBeNull()
    expect(useStoryWorkshopStore.getState().parsedJson?.manifest).toBeDefined()
  })

  // ---------- Revert button (not dirty) ----------

  it('does nothing when Revert is clicked and content is not dirty', () => {
    useStoryWorkshopStore.getState().loadText(VALID_JSON_TEXT)
    renderWithProviders(<WorkshopEditor onClose={vi.fn()} />)

    // Revert button should be disabled when not dirty
    const revertBtn = screen.getByText('Revert')
    expect(revertBtn.closest('button')).toBeDisabled()
  })

  // ---------- Back (no changes) ----------

  it('calls onClose when Back is clicked without unsaved changes', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    useStoryWorkshopStore.getState().loadText(VALID_JSON_TEXT)
    renderWithProviders(<WorkshopEditor onClose={onClose} />)

    const backBtn = screen.getByText('Back')
    await user.click(backBtn)

    expect(onClose).toHaveBeenCalledOnce()
  })

  // ---------- Back (with changes) ----------

  it('triggers confirm dialog when Back is clicked with unsaved changes', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    useStoryWorkshopStore.getState().loadText(VALID_JSON_TEXT)
    useStoryWorkshopStore.getState().updateDraft('{"changed": true}')
    renderWithProviders(<WorkshopEditor onClose={onClose} />)

    const backBtn = screen.getByText('Back')
    await user.click(backBtn)

    expect(confirmSpy).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()

    confirmSpy.mockRestore()
  })

  // ---------- Format button ----------

  it('formats JSON with 2-space indentation when Format is clicked', async () => {
    const user = userEvent.setup()
    const compactJson = JSON.stringify(VALID_JSON)
    useStoryWorkshopStore.getState().loadText(compactJson)
    renderWithProviders(<WorkshopEditor onClose={vi.fn()} />)

    const formatBtn = screen.getByText('Format')
    await user.click(formatBtn)

    const expected = JSON.stringify(VALID_JSON, null, 2)
    expect(useStoryWorkshopStore.getState().editorDraft).toBe(expected)
  })
})
