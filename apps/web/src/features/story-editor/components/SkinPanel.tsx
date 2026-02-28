import { useMemo } from 'react'
import { cn } from '../../../lib/cn'
import type { StageSkinSpec, TransitionSpec } from '../store'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PerformanceTier = 'low' | 'mid' | 'high'
type TransitionType = 'fade' | 'slide' | 'wipe' | 'blur' | 'scale' | 'rotate'

const PERFORMANCE_TIERS: PerformanceTier[] = ['low', 'mid', 'high']
const TRANSITION_TYPES: TransitionType[] = ['fade', 'slide', 'wipe', 'blur', 'scale', 'rotate']

interface SkinPanelProps {
  skinSpec: StageSkinSpec
  selectedTransitionId: string
  onSelectTransition: (id: string) => void
  onAddTransition: () => void
  onRemoveTransition: (id: string) => void
  onUpdateSkinMeta?: (patch: Partial<Pick<StageSkinSpec, 'name' | 'theme' | 'performanceTier'>>) => void
  onUpdateTransition?: (id: string, patch: Partial<TransitionSpec>) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SkinPanel({
  skinSpec,
  selectedTransitionId,
  onSelectTransition,
  onAddTransition,
  onRemoveTransition,
  onUpdateSkinMeta,
  onUpdateTransition,
}: SkinPanelProps): React.JSX.Element {
  const selectedTransition = useMemo<TransitionSpec | null>(() => {
    return skinSpec.transitions?.find((item) => item.id === selectedTransitionId) ?? null
  }, [skinSpec.transitions, selectedTransitionId])

  return (
    <div className="flex flex-col gap-4">
      {/* Skin Meta */}
      <div className="flex flex-col gap-2 rounded-lg border border-gray-700 bg-gray-900/60 p-4">
        <h3 className="font-semibold text-gray-200">Skin Meta</h3>
        <label className="flex flex-col gap-1 text-xs text-gray-400">
          Skin Name
          <input
            type="text"
            value={skinSpec.name ?? ''}
            className="rounded-lg border border-gray-600 bg-gray-900/60 px-2 py-1.5 text-sm text-gray-200"
            onChange={(e) => onUpdateSkinMeta?.({ name: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-400">
          Theme
          <input
            type="text"
            value={skinSpec.theme ?? ''}
            className="rounded-lg border border-gray-600 bg-gray-900/60 px-2 py-1.5 text-sm text-gray-200"
            onChange={(e) => onUpdateSkinMeta?.({ theme: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-400">
          Performance Tier
          <select
            value={skinSpec.performanceTier ?? 'high'}
            className="rounded-lg border border-gray-600 bg-gray-900/60 px-2 py-1.5 text-sm text-gray-200"
            onChange={(e) => onUpdateSkinMeta?.({ performanceTier: e.target.value as PerformanceTier })}
          >
            {PERFORMANCE_TIERS.map((tier) => (
              <option key={tier} value={tier}>{tier}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Transitions */}
      <div className="flex flex-col gap-2 rounded-lg border border-gray-700 bg-gray-900/60 p-4">
        <h3 className="font-semibold text-gray-200">Transitions</h3>
        <div className="flex flex-col gap-1.5">
          {skinSpec.transitions?.map((transition) => (
            <button
              key={transition.id}
              type="button"
              className={cn(
                'rounded-lg border px-2.5 py-1.5 text-left text-sm transition-colors',
                transition.id === selectedTransitionId
                  ? 'border-blue-500 bg-blue-500/10 text-white'
                  : 'border-transparent bg-gray-800/60 text-gray-300 hover:bg-gray-800',
              )}
              onClick={() => onSelectTransition(transition.id)}
            >
              {transition.id} ({transition.type})
            </button>
          ))}
        </div>
        <button
          type="button"
          className="rounded-lg border border-gray-600 bg-gray-800 px-2.5 py-1.5 text-sm text-gray-300 transition-colors hover:bg-gray-700"
          onClick={onAddTransition}
        >
          Add Transition
        </button>
        <button
          type="button"
          className="rounded-lg border border-gray-600 bg-gray-800 px-2.5 py-1.5 text-sm text-red-400 transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!selectedTransitionId}
          onClick={() => onRemoveTransition(selectedTransitionId)}
        >
          Remove Transition
        </button>
      </div>

      {/* Transition Properties */}
      {selectedTransition && (
        <div className="flex flex-col gap-2 rounded-lg border border-gray-700 bg-gray-900/60 p-4">
          <h3 className="font-semibold text-gray-200">Transition Properties</h3>
          <label className="flex flex-col gap-1 text-xs text-gray-400">
            ID
            <input
              type="text"
              value={selectedTransition.id}
              className="rounded-lg border border-gray-600 bg-gray-900/60 px-2 py-1.5 text-sm text-gray-200"
              onChange={(e) => onUpdateTransition?.(selectedTransition.id, { id: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-400">
            Type
            <select
              value={selectedTransition.type}
              className="rounded-lg border border-gray-600 bg-gray-900/60 px-2 py-1.5 text-sm text-gray-200"
              onChange={(e) => onUpdateTransition?.(selectedTransition.id, { type: e.target.value })}
            >
              {TRANSITION_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-400">
            Duration
            <input
              type="number"
              value={selectedTransition.duration}
              className="rounded-lg border border-gray-600 bg-gray-900/60 px-2 py-1.5 text-sm text-gray-200"
              onChange={(e) => onUpdateTransition?.(selectedTransition.id, { duration: Number(e.target.value) })}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-400">
            Easing
            <input
              type="text"
              value={selectedTransition.easing}
              className="rounded-lg border border-gray-600 bg-gray-900/60 px-2 py-1.5 text-sm text-gray-200"
              onChange={(e) => onUpdateTransition?.(selectedTransition.id, { easing: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-400">
            Delay
            <input
              type="number"
              value={selectedTransition.delay}
              className="rounded-lg border border-gray-600 bg-gray-900/60 px-2 py-1.5 text-sm text-gray-200"
              onChange={(e) => onUpdateTransition?.(selectedTransition.id, { delay: Number(e.target.value) })}
            />
          </label>
        </div>
      )}
    </div>
  )
}
