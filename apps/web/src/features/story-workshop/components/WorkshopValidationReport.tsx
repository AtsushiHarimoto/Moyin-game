import { useTranslation } from 'react-i18next'
import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  CheckCircle,
  FileText,
  Film,
  Tag,
  Users,
} from 'lucide-react'
import type { ValidationItem } from '../stores/useStoryWorkshopStore'
import { useStoryWorkshopStore } from '../stores/useStoryWorkshopStore'

type StatusType = 'error' | 'warn' | 'valid'

const STATUS_COLOR: Record<StatusType, string> = {
  error: 'var(--ui-danger)',
  warn: 'var(--ui-warning)',
  valid: 'var(--ui-success)',
}

function resolveStatusType(
  hasParseError: boolean,
  hasErrors: boolean,
  hasWarnings: boolean,
): StatusType {
  if (hasParseError || hasErrors) return 'error'
  if (hasWarnings) return 'warn'
  return 'valid'
}

function StatusIcon({ status }: { status: StatusType }): React.JSX.Element {
  const color = STATUS_COLOR[status]

  switch (status) {
    case 'error':
      return <AlertCircle size={14} style={{ color }} />
    case 'warn':
      return <AlertTriangle size={14} style={{ color }} />
    case 'valid':
      return <CheckCircle size={14} style={{ color }} />
  }
}

interface ValidationRowProps {
  item: ValidationItem | { id: string; message: string; type: 'error' }
}

function ValidationRow({ item }: ValidationRowProps): React.JSX.Element {
  const isError = item.type === 'error'
  const color = isError ? 'var(--ui-danger)' : 'var(--ui-warning)'
  const Icon = isError ? AlertCircle : AlertTriangle

  return (
    <div
      className="flex items-start gap-2 rounded px-2 py-1"
      style={{
        background: `color-mix(in srgb, ${color} 5%, transparent)`,
      }}
    >
      <Icon size={12} className="mt-0.5 flex-shrink-0" style={{ color }} />
      <span className="text-xs" style={{ color }}>
        {item.message}
      </span>
    </div>
  )
}

interface MetaRowProps {
  icon: React.ReactNode
  label: string
  value: string
}

function MetaRow({ icon, label, value }: MetaRowProps): React.JSX.Element {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <span style={{ color: 'var(--ui-muted)' }}>{icon}</span>
        <span className="text-xs" style={{ color: 'var(--ui-muted)' }}>
          {label}
        </span>
      </div>
      <span className="text-xs font-medium" style={{ color: 'var(--ui-text)' }}>
        {value}
      </span>
    </div>
  )
}

export function WorkshopValidationReport(): React.JSX.Element {
  const { t } = useTranslation()
  const errors = useStoryWorkshopStore((s) => s.errors)
  const warnings = useStoryWorkshopStore((s) => s.warnings)
  const parseError = useStoryWorkshopStore((s) => s.parseError)
  const preview = useStoryWorkshopStore((s) => s.preview)

  const hasParseError = !!parseError
  const hasErrors = errors.length > 0
  const hasWarnings = warnings.length > 0
  const statusType = resolveStatusType(hasParseError, hasErrors, hasWarnings)

  return (
    <div className="flex flex-col gap-3 p-3" data-testid="validation-report">
      {/* 狀態摘要 */}
      <div className="flex items-center gap-3">
        <div
          className="flex items-center gap-2 rounded-md px-3 py-1.5"
          style={{
            background: `color-mix(in srgb, ${STATUS_COLOR[statusType]} 10%, transparent)`,
          }}
          data-testid={`status-badge-${statusType}`}
        >
          <StatusIcon status={statusType} />
          <span
            className="text-xs font-semibold"
            style={{ color: STATUS_COLOR[statusType] }}
          >
            {errors.length} {t('message.workshop_errors', 'Errors')} ·{' '}
            {warnings.length} {t('message.workshop_warnings', 'Warnings')}
          </span>
        </div>
      </div>

      {/* 錯誤清單 */}
      {(hasParseError || hasErrors) && (
        <div className="flex flex-col gap-1">
          {hasParseError && (
            <ValidationRow
              item={{ id: 'PARSE_ERROR', message: parseError!, type: 'error' }}
            />
          )}
          {errors.map((err) => (
            <ValidationRow key={err.id} item={err} />
          ))}
        </div>
      )}

      {/* 警告清單 */}
      {hasWarnings && (
        <div className="flex flex-col gap-1">
          {warnings.map((warn) => (
            <ValidationRow key={warn.id} item={warn} />
          ))}
        </div>
      )}

      {/* 故事包 metadata */}
      {preview && (
        <div
          className="flex flex-col gap-1.5 rounded-md border p-3"
          style={{
            background: 'var(--ui-panel-subtle)',
            borderColor: 'var(--ui-border)',
          }}
        >
          <MetaRow
            icon={<FileText size={12} />}
            label={t('message.workshop_title', 'Title')}
            value={preview.title ?? '-'}
          />
          <MetaRow
            icon={<Tag size={12} />}
            label={t('message.workshop_storykey', 'Key')}
            value={preview.storyKey ?? '-'}
          />
          <MetaRow
            icon={<Tag size={12} />}
            label={t('message.workshop_version', 'Version')}
            value={preview.packVersion ?? '-'}
          />
          <MetaRow
            icon={<BookOpen size={12} />}
            label={t('message.workshop_chapters', 'Chapters')}
            value={String(preview.chapterCount ?? 0)}
          />
          <MetaRow
            icon={<Film size={12} />}
            label={t('message.workshop_scenes', 'Scenes')}
            value={String(preview.sceneCount ?? 0)}
          />
          <MetaRow
            icon={<Users size={12} />}
            label={t('message.workshop_characters', 'Characters')}
            value={String(preview.characterCount ?? 0)}
          />
        </div>
      )}
    </div>
  )
}
