import type { BindingEntry } from '../store'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BindingType = 'components' | 'events' | 'states'

interface BindingPanelProps {
  componentBindings: BindingEntry[]
  eventBindings: BindingEntry[]
  stateBindings: BindingEntry[]
  onAddBinding: (type: BindingType) => void
  onRemoveBinding: (type: BindingType, index: number) => void
  onUpdateBinding: (type: BindingType, index: number, entry: BindingEntry) => void
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface BindingSectionProps {
  title: string
  type: BindingType
  bindings: BindingEntry[]
  keyPlaceholder: string
  valuePlaceholder: string
  onAdd: (type: BindingType) => void
  onRemove: (type: BindingType, index: number) => void
  onUpdate: (type: BindingType, index: number, entry: BindingEntry) => void
}

function BindingSection({
  title,
  type,
  bindings,
  keyPlaceholder,
  valuePlaceholder,
  onAdd,
  onRemove,
  onUpdate,
}: BindingSectionProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-gray-700 bg-gray-900/60 p-4">
      <h3 className="font-semibold text-gray-200">{title}</h3>

      <div className="flex flex-col gap-2">
        {bindings.map((binding, index) => (
          <div key={`${type}-${index}`} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
            <input
              type="text"
              value={binding.key}
              placeholder={keyPlaceholder}
              className="rounded-lg border border-gray-600 bg-gray-900/60 px-1.5 py-1.5 text-sm text-gray-200"
              onChange={(e) => onUpdate(type, index, { ...binding, key: e.target.value })}
            />
            <input
              type="text"
              value={binding.value}
              placeholder={valuePlaceholder}
              className="rounded-lg border border-gray-600 bg-gray-900/60 px-1.5 py-1.5 text-sm text-gray-200"
              onChange={(e) => onUpdate(type, index, { ...binding, value: e.target.value })}
            />
            <button
              type="button"
              className="rounded-lg border border-gray-600 bg-gray-800 px-2 py-1 text-sm text-gray-300 transition-colors hover:bg-gray-700"
              onClick={() => onRemove(type, index)}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="rounded-lg border border-gray-600 bg-gray-800 px-2.5 py-1.5 text-sm text-gray-300 transition-colors hover:bg-gray-700"
        onClick={() => onAdd(type)}
      >
        Add {title.replace(' Bindings', '')} Binding
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BindingPanel({
  componentBindings,
  eventBindings,
  stateBindings,
  onAddBinding,
  onRemoveBinding,
  onUpdateBinding,
}: BindingPanelProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      <BindingSection
        title="Component Bindings"
        type="components"
        bindings={componentBindings}
        keyPlaceholder="Component"
        valuePlaceholder="Value"
        onAdd={onAddBinding}
        onRemove={onRemoveBinding}
        onUpdate={onUpdateBinding}
      />
      <BindingSection
        title="Event Bindings"
        type="events"
        bindings={eventBindings}
        keyPlaceholder="Event"
        valuePlaceholder="Animation"
        onAdd={onAddBinding}
        onRemove={onRemoveBinding}
        onUpdate={onUpdateBinding}
      />
      <BindingSection
        title="State Bindings"
        type="states"
        bindings={stateBindings}
        keyPlaceholder="State"
        valuePlaceholder="Effect"
        onAdd={onAddBinding}
        onRemove={onRemoveBinding}
        onUpdate={onUpdateBinding}
      />
    </div>
  )
}
