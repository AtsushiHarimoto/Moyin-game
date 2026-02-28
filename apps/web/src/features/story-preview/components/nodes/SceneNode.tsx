import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../../../lib/cn'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SceneNodeData {
  type: 'scene'
  id: string
  name: string
  background?: string
  dialogueCount: number
  branchCount: number
  isEntry?: boolean
  isGhost?: boolean
  description?: string
  activeCast?: string[]
  activeCastNames?: string[]
  [key: string]: unknown
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SceneNode({
  data,
  selected,
}: NodeProps): React.JSX.Element {
  const { t } = useTranslation()
  const {
    id,
    name,
    background,
    dialogueCount,
    branchCount,
    isEntry,
    isGhost,
    activeCast,
    activeCastNames,
  } = data as SceneNodeData

  const displayName = isGhost ? `${t('message.flow_ghost_prefix')} ${name}` : name

  return (
    <div
      className={cn(
        'w-[160px] overflow-hidden rounded-xl border border-[#3b2166]',
        'bg-[rgba(20,10,35,0.95)] transition-all duration-200',
        selected && 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]',
        isGhost && 'border-dashed border-amber-500/50',
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2.5 !w-2.5 !border-2 !border-[rgba(20,10,35,0.95)] !bg-blue-500"
      />

      {/* Ghost warning */}
      {isGhost && (
        <div className="flex items-center gap-1 bg-amber-500/10 px-3 py-1 text-xs text-amber-400">
          <span aria-hidden="true">{'\u26a0'}</span> {t('message.flow_ghost_warning')}
        </div>
      )}

      {/* Background */}
      <div
        className={cn(
          'flex h-[90px] w-full items-center justify-center overflow-hidden bg-gradient-to-br from-blue-500/10 to-[rgba(15,5,26,0.8)]',
          isGhost && 'opacity-50',
        )}
      >
        {background ? (
          <img
            src={background}
            alt={name}
            className="h-full w-full object-cover"
            width={160}
            height={90}
            loading="lazy"
          />
        ) : (
          <span className="text-4xl opacity-50" aria-hidden="true">
            🎬
          </span>
        )}
      </div>

      {/* Info */}
      <div className={cn('p-3', isGhost && 'opacity-50')}>
        {/* Entry badge */}
        {isEntry && (
          <span className="mb-1 inline-block rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold text-indigo-400">
            {t('message.flow_entry_label')}
          </span>
        )}

        <h4 className="m-0 mb-1 truncate text-sm font-semibold text-[#f3f0ff]">
          {displayName}
        </h4>
        <div className="mb-2 font-mono text-xs text-[#6d5091]">{id}</div>
        <div className="flex gap-3 text-xs text-[#a78bfa]">
          <span title="Dialogues">
            <span aria-hidden="true">💬</span> {dialogueCount}
          </span>
          <span title="Branches">
            <span aria-hidden="true">🔀</span> {branchCount}
          </span>
        </div>

        {/* Active cast */}
        {activeCast != null && activeCast.length > 0 && (
          <div
            className="mt-2 inline-block rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] text-green-400"
            title={activeCastNames?.join(', ') ?? activeCast.join(', ')}
          >
            {t('message.flow_cast_count', { count: activeCast.length })}
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!h-2.5 !w-2.5 !border-2 !border-[rgba(20,10,35,0.95)] !bg-blue-500"
      />
    </div>
  )
}
