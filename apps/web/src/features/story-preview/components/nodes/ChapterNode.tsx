import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../../../lib/cn'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * 用途：章節節點的資料結構定義
 */
export interface ChapterNodeData {
  type: 'chapter'
  id: string
  title: string
  sceneCount: number
  entrySceneId?: string
  sceneIds?: string[]
  hasInvalidEntry?: boolean
  isVirtual?: boolean
  [key: string]: unknown
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * 用途：ReactFlow 章節節點元件，顯示章節標題、場景數與入口場景
 */
export default function ChapterNode({
  data,
  selected,
}: NodeProps): React.JSX.Element {
  const { t } = useTranslation()
  const { id, title, sceneCount, entrySceneId, hasInvalidEntry, isVirtual } = data as ChapterNodeData
  const displayTitle = isVirtual ? t('message.flow_chapter_unassigned') : title
  return (
    <div
      className={cn(
        'w-[180px] overflow-hidden rounded-xl border border-[#3b2166]',
        'bg-[rgba(20,10,35,0.95)] transition-all duration-200',
        selected && 'border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.3)]',
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2.5 !w-2.5 !border-2 !border-[rgba(20,10,35,0.95)] !bg-indigo-500"
      />

      {/* Header */}
      <div className="flex h-[60px] w-full items-center justify-center bg-gradient-to-br from-indigo-500/15 to-[rgba(15,5,26,0.8)]">
        <span className="text-2xl font-bold text-indigo-400/60" aria-hidden="true">
          {t('message.flow_ch_abbr')}
        </span>
      </div>

      {/* Info */}
      <div className="p-3">
        <h4 className="m-0 mb-1 truncate text-sm font-semibold text-[#f3f0ff]">
          {displayTitle}
        </h4>
        <div className="mb-2 font-mono text-xs text-[#6d5091]">
          {id}
        </div>
        <div className="flex flex-col gap-1 text-xs text-[#a78bfa]">
          <span>{t('message.flow_scene_count', { count: sceneCount })}</span>
          {entrySceneId && (
            <span className={cn('truncate', hasInvalidEntry && 'text-amber-400')} title={`${t('message.flow_entry_label')}: ${entrySceneId}`}>
              {hasInvalidEntry && <span aria-hidden="true">{'\u26a0'} </span>}
              {t('message.flow_entry_label')}: {entrySceneId}
            </span>
          )}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!h-2.5 !w-2.5 !border-2 !border-[rgba(20,10,35,0.95)] !bg-indigo-500"
      />
    </div>
  )
}
