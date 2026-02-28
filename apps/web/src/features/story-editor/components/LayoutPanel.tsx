import { useMemo } from 'react'
import { cn } from '../../../lib/cn'
import type { StageLayoutSpec, StageLayoutSlot } from '../store'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AnchorValue = 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

const ANCHOR_OPTIONS: AnchorValue[] = [
  'center',
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
]

interface LayoutPanelProps {
  layoutSpec: StageLayoutSpec
  selectedLayerId: string
  selectedSlotId: string
  onSelectLayer: (id: string) => void
  onSelectSlot: (id: string) => void
  onAddLayer: () => void
  onRemoveLayer: (id: string) => void
  onAddSlot: (layerId: string) => void
  onRemoveSlot: (layerId: string, slotId: string) => void
  onUpdateSlot: (payload: {
    id: string
    name?: string
    anchor?: string
    offset?: { x: number; y: number }
    size?: { widthPx?: number; heightPx?: number }
  }) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LayoutPanel({
  layoutSpec,
  selectedLayerId,
  selectedSlotId,
  onSelectLayer,
  onSelectSlot,
  onAddLayer,
  onRemoveLayer,
  onAddSlot,
  onRemoveSlot,
  onUpdateSlot,
}: LayoutPanelProps): React.JSX.Element {
  const selectedLayerSlots = useMemo(() => {
    const layer = layoutSpec.layers.find((item) => item.id === selectedLayerId)
    return layer?.slots ?? []
  }, [layoutSpec.layers, selectedLayerId])

  const selectedSlot = useMemo<StageLayoutSlot | null>(() => {
    return selectedLayerSlots.find((item) => item.id === selectedSlotId) ?? null
  }, [selectedLayerSlots, selectedSlotId])

  return (
    <div className="flex flex-col gap-4">
      {/* Layers */}
      <div className="flex flex-col gap-2 rounded-lg border border-gray-700 bg-gray-900/60 p-4">
        <h3 className="font-semibold text-gray-200">Layers</h3>
        <div className="flex flex-col gap-1.5">
          {layoutSpec.layers.map((layer) => (
            <button
              key={layer.id}
              type="button"
              className={cn(
                'rounded-lg border px-2.5 py-1.5 text-left text-sm transition-colors',
                layer.id === selectedLayerId
                  ? 'border-blue-500 bg-blue-500/10 text-white'
                  : 'border-transparent bg-gray-800/60 text-gray-300 hover:bg-gray-800',
              )}
              onClick={() => onSelectLayer(layer.id)}
            >
              {layer.name}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="rounded-lg border border-gray-600 bg-gray-800 px-2.5 py-1.5 text-sm text-gray-300 transition-colors hover:bg-gray-700"
          onClick={onAddLayer}
        >
          Add Layer
        </button>
        <button
          type="button"
          className="rounded-lg border border-gray-600 bg-gray-800 px-2.5 py-1.5 text-sm text-red-400 transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!selectedLayerId}
          onClick={() => onRemoveLayer(selectedLayerId)}
        >
          Remove Layer
        </button>
      </div>

      {/* Slots */}
      <div className="flex flex-col gap-2 rounded-lg border border-gray-700 bg-gray-900/60 p-4">
        <h3 className="font-semibold text-gray-200">Slots</h3>
        <div className="flex flex-col gap-1.5">
          {selectedLayerSlots.map((slot) => (
            <button
              key={slot.id}
              type="button"
              className={cn(
                'rounded-lg border px-2.5 py-1.5 text-left text-sm transition-colors',
                slot.id === selectedSlotId
                  ? 'border-blue-500 bg-blue-500/10 text-white'
                  : 'border-transparent bg-gray-800/60 text-gray-300 hover:bg-gray-800',
              )}
              onClick={() => onSelectSlot(slot.id)}
            >
              {slot.name}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="rounded-lg border border-gray-600 bg-gray-800 px-2.5 py-1.5 text-sm text-gray-300 transition-colors hover:bg-gray-700"
          onClick={() => onAddSlot(selectedLayerId)}
        >
          Add Slot
        </button>
        <button
          type="button"
          className="rounded-lg border border-gray-600 bg-gray-800 px-2.5 py-1.5 text-sm text-red-400 transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!selectedSlotId}
          onClick={() => onRemoveSlot(selectedLayerId, selectedSlotId)}
        >
          Remove Slot
        </button>
      </div>

      {/* Slot Properties */}
      {selectedSlot && (
        <div className="flex flex-col gap-2 rounded-lg border border-gray-700 bg-gray-900/60 p-4">
          <h3 className="font-semibold text-gray-200">Slot Properties</h3>
          <label className="flex flex-col gap-1 text-xs text-gray-400">
            Name
            <input
              type="text"
              value={selectedSlot.name}
              className="rounded-lg border border-gray-600 bg-gray-900/60 px-2 py-1.5 text-sm text-gray-200"
              onChange={(e) => onUpdateSlot({ id: selectedSlot.id, name: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-400">
            Anchor
            <select
              value={selectedSlot.anchor ?? 'center'}
              className="rounded-lg border border-gray-600 bg-gray-900/60 px-2 py-1.5 text-sm text-gray-200"
              onChange={(e) => onUpdateSlot({ id: selectedSlot.id, anchor: e.target.value })}
            >
              {ANCHOR_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-400">
            Offset X
            <input
              type="number"
              value={selectedSlot.offset?.x ?? 0}
              className="rounded-lg border border-gray-600 bg-gray-900/60 px-2 py-1.5 text-sm text-gray-200"
              onChange={(e) =>
                onUpdateSlot({
                  id: selectedSlot.id,
                  offset: { x: Number(e.target.value), y: selectedSlot.offset?.y ?? 0 },
                })
              }
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-400">
            Offset Y
            <input
              type="number"
              value={selectedSlot.offset?.y ?? 0}
              className="rounded-lg border border-gray-600 bg-gray-900/60 px-2 py-1.5 text-sm text-gray-200"
              onChange={(e) =>
                onUpdateSlot({
                  id: selectedSlot.id,
                  offset: { x: selectedSlot.offset?.x ?? 0, y: Number(e.target.value) },
                })
              }
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-400">
            Width (px)
            <input
              type="number"
              value={selectedSlot.size?.widthPx ?? 200}
              className="rounded-lg border border-gray-600 bg-gray-900/60 px-2 py-1.5 text-sm text-gray-200"
              onChange={(e) =>
                onUpdateSlot({
                  id: selectedSlot.id,
                  size: { widthPx: Number(e.target.value), heightPx: selectedSlot.size?.heightPx },
                })
              }
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-400">
            Height (px)
            <input
              type="number"
              value={selectedSlot.size?.heightPx ?? 200}
              className="rounded-lg border border-gray-600 bg-gray-900/60 px-2 py-1.5 text-sm text-gray-200"
              onChange={(e) =>
                onUpdateSlot({
                  id: selectedSlot.id,
                  size: { widthPx: selectedSlot.size?.widthPx, heightPx: Number(e.target.value) },
                })
              }
            />
          </label>
        </div>
      )}
    </div>
  )
}
