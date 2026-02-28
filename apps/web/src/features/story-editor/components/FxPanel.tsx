import { useMemo } from 'react'
import { cn } from '../../../lib/cn'
import type { FxPresetSpec, FxEffect } from '../store'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FxPanelProps {
  fxPresets: FxPresetSpec[]
  selectedPresetId: string
  onSelectPreset: (id: string) => void
  onAddPreset: () => void
  onRemovePreset: (id: string) => void
  onAddEffect: (presetId: string) => void
  onRemoveEffect: (presetId: string, index: number) => void
  onUpdateEffect?: (presetId: string, index: number, effect: FxEffect) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FxPanel({
  fxPresets,
  selectedPresetId,
  onSelectPreset,
  onAddPreset,
  onRemovePreset,
  onAddEffect,
  onRemoveEffect,
  onUpdateEffect,
}: FxPanelProps): React.JSX.Element {
  const selectedPreset = useMemo(() => {
    return fxPresets.find((item) => item.id === selectedPresetId) ?? null
  }, [fxPresets, selectedPresetId])

  return (
    <div className="flex flex-col gap-4">
      {/* Preset list */}
      <div className="flex flex-col gap-2 rounded-lg border border-gray-700 bg-gray-900/60 p-4">
        <h3 className="font-semibold text-gray-200">FX Presets</h3>
        <div className="flex flex-col gap-1.5">
          {fxPresets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={cn(
                'rounded-lg border px-2.5 py-1.5 text-left text-sm transition-colors',
                preset.id === selectedPresetId
                  ? 'border-blue-500 bg-blue-500/10 text-white'
                  : 'border-transparent bg-gray-800/60 text-gray-300 hover:bg-gray-800',
              )}
              onClick={() => onSelectPreset(preset.id)}
            >
              {preset.id}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="rounded-lg border border-gray-600 bg-gray-800 px-2.5 py-1.5 text-sm text-gray-300 transition-colors hover:bg-gray-700"
          onClick={onAddPreset}
        >
          Add Preset
        </button>
        <button
          type="button"
          className="rounded-lg border border-gray-600 bg-gray-800 px-2.5 py-1.5 text-sm text-red-400 transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!selectedPresetId}
          onClick={() => onRemovePreset(selectedPresetId)}
        >
          Remove Preset
        </button>
      </div>

      {/* Effects editor */}
      {selectedPreset && (
        <div className="flex flex-col gap-2 rounded-lg border border-gray-700 bg-gray-900/60 p-4">
          <h3 className="font-semibold text-gray-200">Preset Effects</h3>
          <div className="flex flex-col gap-2">
            {selectedPreset.effects.map((effect, index) => (
              <div
                key={`${effect.type}-${index}`}
                className="grid grid-cols-[1fr_80px_auto_auto] items-center gap-2"
              >
                <input
                  type="text"
                  value={effect.type}
                  placeholder="effect type"
                  className="rounded-lg border border-gray-600 bg-gray-900/60 px-1.5 py-1.5 text-sm text-gray-200"
                  onChange={(e) =>
                    onUpdateEffect?.(selectedPreset.id, index, { ...effect, type: e.target.value })
                  }
                />
                <input
                  type="number"
                  value={effect.intensity}
                  step={0.1}
                  className="rounded-lg border border-gray-600 bg-gray-900/60 px-1.5 py-1.5 text-sm text-gray-200"
                  onChange={(e) =>
                    onUpdateEffect?.(selectedPreset.id, index, {
                      ...effect,
                      intensity: Number(e.target.value),
                    })
                  }
                />
                <label className="flex items-center gap-1 text-xs text-gray-400">
                  <input
                    type="checkbox"
                    checked={effect.enabled}
                    onChange={(e) =>
                      onUpdateEffect?.(selectedPreset.id, index, {
                        ...effect,
                        enabled: e.target.checked,
                      })
                    }
                  />
                  Enabled
                </label>
                <button
                  type="button"
                  className="rounded-lg border border-gray-600 bg-gray-800 px-2 py-1 text-sm text-gray-300 transition-colors hover:bg-gray-700"
                  onClick={() => onRemoveEffect(selectedPreset.id, index)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="rounded-lg border border-gray-600 bg-gray-800 px-2.5 py-1.5 text-sm text-gray-300 transition-colors hover:bg-gray-700"
            onClick={() => onAddEffect(selectedPreset.id)}
          >
            Add Effect
          </button>
        </div>
      )}
    </div>
  )
}
