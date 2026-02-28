import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { cn } from '../../../../lib/cn'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CharacterNodeData {
  type: 'character'
  id: string
  name: string
  portrait?: string
  expressionCount: number
  poseCount: number
  [key: string]: unknown
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CharacterNode({
  data,
  selected,
}: NodeProps): React.JSX.Element {
  const { name, portrait, expressionCount, poseCount } = data as CharacterNodeData
  return (
    <div
      className={cn(
        'w-[140px] overflow-hidden rounded-xl border border-[#3b2166]',
        'bg-[rgba(20,10,35,0.95)] transition-all duration-200',
        selected && 'border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)]',
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2.5 !w-2.5 !border-2 !border-[rgba(20,10,35,0.95)] !bg-green-500"
      />

      {/* Portrait */}
      <div className="flex h-[100px] w-full items-center justify-center overflow-hidden bg-gradient-to-br from-green-500/10 to-[rgba(15,5,26,0.8)]">
        {portrait ? (
          <img
            src={portrait}
            alt={name}
            className="h-full w-full object-cover"
            width={140}
            height={100}
            loading="lazy"
          />
        ) : (
          <span className="text-4xl opacity-50" aria-hidden="true">
            👤
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h4 className="m-0 mb-1 truncate text-sm font-semibold text-[#f3f0ff]">
          {name}
        </h4>
        <div className="mb-2 font-mono text-xs text-[#6d5091]">{(data as CharacterNodeData).id}</div>
        <div className="flex gap-2 text-xs text-[#a78bfa]">
          <span title="Expressions">
            <span aria-hidden="true">😀</span> {expressionCount}
          </span>
          <span title="Poses">
            <span aria-hidden="true">🧍</span> {poseCount}
          </span>
        </div>
      </div>
    </div>
  )
}
