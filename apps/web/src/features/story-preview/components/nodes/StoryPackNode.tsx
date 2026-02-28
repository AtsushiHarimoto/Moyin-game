import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../../../lib/cn'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StoryPackNodeData {
  type: 'story-pack'
  title: string
  storyKey: string
  version: string
  author?: string
  coverImage?: string
  sceneCount?: number
  chapterCount?: number
  characterCount?: number
  [key: string]: unknown
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StoryPackNode({
  data,
  selected,
}: NodeProps): React.JSX.Element {
  const { t } = useTranslation()
  const { title, storyKey, version, coverImage, sceneCount, chapterCount, characterCount } = data as StoryPackNodeData
  return (
    <div
      className={cn(
        'w-[200px] overflow-hidden rounded-2xl border-2 border-purple-500',
        'bg-[rgba(20,10,35,0.95)] transition-shadow duration-200',
        (selected) && 'shadow-[0_0_30px_rgba(168,85,247,0.4)]',
      )}
    >
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !border-2 !border-[rgba(20,10,35,0.95)] !bg-purple-500"
      />

      {/* Cover */}
      <div className="flex h-[100px] w-full items-center justify-center bg-gradient-to-br from-purple-500/20 to-[rgba(15,5,26,0.8)]">
        {coverImage ? (
          <img
            src={coverImage}
            alt={title}
            className="h-full w-full object-cover"
            width={200}
            height={100}
            loading="lazy"
          />
        ) : (
          <span className="text-5xl" aria-hidden="true">
            📦
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="m-0 mb-2 truncate text-base font-bold text-[#f3f0ff]">
          {title}
        </h3>
        <div className="flex justify-between text-xs text-[#a78bfa]">
          <span>v{version}</span>
          <span className="font-mono">{storyKey}</span>
        </div>

        {/* Stats row */}
        <div className="flex gap-3 text-xs text-[#a78bfa] mt-1">
          {sceneCount != null && <span>{t('message.flow_stat_scenes', { count: sceneCount })}</span>}
          {chapterCount != null && <span>{t('message.flow_stat_chapters', { count: chapterCount })}</span>}
          {characterCount != null && <span>{t('message.flow_stat_chars', { count: characterCount })}</span>}
        </div>
      </div>
    </div>
  )
}
