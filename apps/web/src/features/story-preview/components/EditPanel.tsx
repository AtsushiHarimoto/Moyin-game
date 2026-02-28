import { useState, useEffect } from 'react'
import type { Node } from '@xyflow/react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EditPanelProps {
  selectedNode: Node | null
  onClose: () => void
  onUpdate: (nodeId: string, changes: Record<string, unknown>) => void
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NODE_TYPE_LABELS: Record<string, string> = {
  'story-pack': 'Story Pack',
  character: 'Character',
  scene: 'Scene',
}

const NODE_TYPE_ICONS: Record<string, string> = {
  'story-pack': '📦',
  character: '👤',
  scene: '🎬',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EditPanel({
  selectedNode,
  onClose,
  onUpdate,
}: EditPanelProps): React.JSX.Element {
  const [editForm, setEditForm] = useState<Record<string, unknown>>({})
  const [isDirty, setIsDirty] = useState(false)

  const nodeType = (selectedNode?.data as Record<string, unknown>)?.type as string | undefined
  const typeLabel = NODE_TYPE_LABELS[nodeType ?? ''] ?? 'Node'
  const typeIcon = NODE_TYPE_ICONS[nodeType ?? ''] ?? '📝'

  useEffect(() => {
    if (selectedNode) {
      setEditForm({ ...(selectedNode.data as Record<string, unknown>) })
      setIsDirty(false)
    }
  }, [selectedNode])

  function updateField(key: string, value: unknown): void {
    setEditForm((prev) => ({ ...prev, [key]: value }))
    setIsDirty(true)
  }

  function handleReset(): void {
    if (selectedNode) {
      setEditForm({ ...(selectedNode.data as Record<string, unknown>) })
      setIsDirty(false)
    }
  }

  function handleApply(): void {
    if (!selectedNode || !isDirty) return
    onUpdate(selectedNode.id, { ...editForm })
    setIsDirty(false)
  }

  // Empty state
  if (!selectedNode) {
    return (
      <div className="flex w-[280px] items-center justify-center border-l border-[#3b2166] bg-[rgba(20,10,35,0.98)]">
        <div className="text-center text-[#6d5091]">
          <span className="mb-2 block text-3xl">👆</span>
          <p className="m-0 text-sm">Click a node to edit</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex w-[280px] flex-col border-l border-[#3b2166] bg-[rgba(20,10,35,0.98)]">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[#3b2166] p-4">
        <span className="text-xl">{typeIcon}</span>
        <span className="flex-1 text-sm font-semibold text-[#f3f0ff]">
          Edit {typeLabel}
        </span>
        <button
          type="button"
          className="border-none bg-transparent p-1 text-[#6d5091] transition-colors hover:text-purple-500"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4">
        {nodeType === 'story-pack' && (
          <>
            <EditField
              label="Title"
              value={String(editForm.title ?? '')}
              onChange={(v) => updateField('title', v)}
            />
            <EditField
              label="Version"
              value={String(editForm.version ?? '')}
              onChange={(v) => updateField('version', v)}
              placeholder="1.0.0"
            />
            <EditField
              label="Story Key"
              value={String(editForm.storyKey ?? '')}
              onChange={(v) => updateField('storyKey', v)}
              mono
            />
          </>
        )}

        {nodeType === 'character' && (
          <>
            <EditField
              label="Name"
              value={String(editForm.name ?? '')}
              onChange={(v) => updateField('name', v)}
            />
            <EditField
              label="ID"
              value={String(editForm.id ?? '')}
              onChange={(v) => updateField('id', v)}
              mono
              hint="Changing the ID may break dialogue references."
            />
          </>
        )}

        {nodeType === 'scene' && (
          <>
            <EditField
              label="Name"
              value={String(editForm.name ?? '')}
              onChange={(v) => updateField('name', v)}
            />
            <EditField
              label="ID"
              value={String(editForm.id ?? '')}
              onChange={(v) => updateField('id', v)}
              mono
              hint="Changing the ID may break dialogue references."
            />
          </>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-[#3b2166] p-4">
        {isDirty && (
          <span className="mb-3 block text-xs text-amber-500">
            ● Unsaved changes
          </span>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            className="flex-1 rounded-xl border border-[#3b2166] bg-transparent py-2 text-sm text-[#a78bfa] transition-colors hover:border-purple-500"
            onClick={handleReset}
          >
            Cancel
          </button>
          <button
            type="button"
            className="flex-1 rounded-xl border-none bg-purple-500 py-2 text-sm text-white transition-colors hover:bg-purple-400 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!isDirty}
            onClick={handleApply}
          >
            ✓ Apply
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// EditField sub-component
// ---------------------------------------------------------------------------

interface EditFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  mono?: boolean
  hint?: string
}

function EditField({
  label,
  value,
  onChange,
  placeholder,
  mono,
  hint,
}: EditFieldProps): React.JSX.Element {
  return (
    <div className="mb-4">
      <label className="mb-2 block text-xs uppercase tracking-wide text-[#a78bfa]">
        {label}
      </label>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        className={`w-full rounded-xl border border-[#3b2166] bg-[rgba(15,5,26,0.8)] p-3 text-sm text-[#f3f0ff] outline-none transition-all focus:border-purple-500 focus:shadow-[0_0_0_2px_rgba(168,85,247,0.2)] ${
          mono ? 'font-mono' : ''
        }`}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && (
        <span className="mt-1 block text-xs text-amber-500">{hint}</span>
      )}
    </div>
  )
}
