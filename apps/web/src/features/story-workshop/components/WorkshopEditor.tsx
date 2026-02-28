import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { useWorkshopKeyboard } from '../hooks/useWorkshopKeyboard'
import { useStoryWorkshopStore, selectIsDirty } from '../stores/useStoryWorkshopStore'
import { WorkshopJsonEditor } from './WorkshopJsonEditor'
import { WorkshopPreview } from './WorkshopPreview'
import { WorkshopStatusBar } from './WorkshopStatusBar'
import { WorkshopToolbar } from './WorkshopToolbar'
import { WorkshopTopBar } from './WorkshopTopBar'

interface WorkshopEditorProps {
  onClose: () => void
}

export function WorkshopEditor({ onClose }: WorkshopEditorProps) {
  const { t } = useTranslation()
  const isDirty = useStoryWorkshopStore(selectIsDirty)
  const revertDraft = useStoryWorkshopStore((s) => s.revertDraft)

  useWorkshopKeyboard()

  const handleBack = useCallback(() => {
    if (isDirty) {
      const confirmed = window.confirm(
        t('message.workshop_exit_confirm', 'You have unsaved changes. Discard and leave?')
      )
      if (!confirmed) return
      revertDraft()
    }
    onClose()
  }, [isDirty, onClose, revertDraft, t])

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{
        zIndex: 'var(--z-modal)',
        background: 'var(--ui-bg)',
        color: 'var(--ui-text)',
      }}
      data-testid="workshop-editor-root"
    >
      <WorkshopTopBar onBack={handleBack} />

      <div className="flex min-h-0 flex-1 max-md:flex-col">
        <WorkshopToolbar />
        <WorkshopJsonEditor />
        <WorkshopPreview />
      </div>

      <WorkshopStatusBar />
    </div>
  )
}
