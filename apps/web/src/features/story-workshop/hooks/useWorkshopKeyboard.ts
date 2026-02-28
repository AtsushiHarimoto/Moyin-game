import { useEffect } from 'react'
import { useStoryWorkshopStore, selectCanConfirm, selectIsDirty } from '../stores/useStoryWorkshopStore'

export function useWorkshopKeyboard() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const store = useStoryWorkshopStore.getState()

      // Ctrl+S - Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && !e.shiftKey) {
        e.preventDefault()
        if (selectCanConfirm(store) && selectIsDirty(store)) {
          store.saveToRegistry()
        }
        return
      }

      // Ctrl+Shift+F - Format
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
        e.preventDefault()
        try {
          const parsed = JSON.parse(store.editorDraft)
          store.updateDraft(JSON.stringify(parsed, null, 2))
        } catch { /* ignore malformed JSON */ }
        return
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
}
