import { useTranslation } from 'react-i18next'
import { ClipboardCheck, Eye } from 'lucide-react'
import { CollapsiblePanel } from './CollapsiblePanel'
import { WorkshopScenePreview } from './WorkshopScenePreview'
import { WorkshopValidationReport } from './WorkshopValidationReport'

export function WorkshopPreview(): React.JSX.Element {
  const { t } = useTranslation()

  return (
    <aside
      className="flex w-[380px] min-w-[280px] flex-col overflow-y-auto border-l max-lg:w-[320px] max-md:w-full max-md:border-l-0 max-md:border-t"
      style={{
        background: 'var(--ui-panel-subtle)',
        borderColor: 'var(--ui-border)',
      }}
    >
      <CollapsiblePanel
        title={t('message.workshop_scene_preview', 'Scene Preview')}
        icon={<Eye size={14} />}
        testId="workshop-scene-preview-panel"
      >
        <WorkshopScenePreview />
      </CollapsiblePanel>

      <CollapsiblePanel
        title={t('message.workshop_validation', 'Validation')}
        icon={<ClipboardCheck size={14} />}
        testId="workshop-validation-panel"
      >
        <WorkshopValidationReport />
      </CollapsiblePanel>
    </aside>
  )
}
