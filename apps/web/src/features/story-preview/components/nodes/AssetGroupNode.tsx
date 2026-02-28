import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { cn } from '../../../../lib/cn'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AssetItem {
  id: string
  name: string
  thumbnail?: string
}

export interface AssetGroupNodeData {
  type: 'asset-group'
  category: 'backgrounds' | 'bgm' | 'se' | 'sprites'
  items: AssetItem[]
  count: number
  [key: string]: unknown
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CATEGORY_ICONS: Record<string, string> = {
  backgrounds: '🖼️',
  bgm: '🎵',
  se: '🔊',
  sprites: '🎭',
}

const CATEGORY_LABELS: Record<string, string> = {
  backgrounds: 'Backgrounds',
  bgm: 'BGM',
  se: 'SFX',
  sprites: 'Sprites',
}

function getCategoryIcon(category: string): string {
  return CATEGORY_ICONS[category] ?? '📁'
}

function getCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AssetGroupNode({
  data,
}: NodeProps): React.JSX.Element {
  const { category, items, count } = data as AssetGroupNodeData
  const icon = getCategoryIcon(category)
  const label = getCategoryLabel(category)

  return (
    <div
      className={cn(
        'w-[180px] overflow-hidden rounded-xl border border-[#3b2166]',
        'bg-[rgba(20,10,35,0.95)] transition-all duration-200',
        'hover:border-amber-500 hover:shadow-[0_0_15px_rgba(245,158,11,0.2)]',
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2.5 !w-2.5 !border-2 !border-[rgba(20,10,35,0.95)] !bg-amber-500"
      />

      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[#3b2166] p-3">
        <span className="text-base">{icon}</span>
        <span className="flex-1 text-sm font-semibold text-[#f3f0ff]">{label}</span>
        <span className="text-xs text-[#a78bfa]">({count})</span>
      </div>

      {/* Thumbnails */}
      <div className="grid grid-cols-3 gap-1 p-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-[rgba(15,5,26,0.6)]"
            title={item.name}
          >
            {item.thumbnail ? (
              <img
                src={item.thumbnail}
                alt={item.name}
                className="h-full w-full object-cover"
                width={48}
                height={48}
                loading="lazy"
              />
            ) : (
              <span className="text-xl opacity-40" aria-hidden="true">
                {icon}
              </span>
            )}
          </div>
        ))}
        {count > 6 && (
          <div className="flex aspect-square items-center justify-center rounded-lg bg-purple-500/10 text-xs text-[#a78bfa]">
            +{count - 6}
          </div>
        )}
      </div>
    </div>
  )
}
