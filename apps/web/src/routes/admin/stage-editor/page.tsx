/** Stage Editor - visual layout & skin configuration for VN stages. */
import { useState, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { downloadJson as downloadJsonFile } from '@/lib/download'
import {
  useEditorStore,
  type StageLayoutSpec,
  type StageSkinSpec,
  type StageLayoutSlot,
  type BindingEntry,
} from '@/features/story-editor/store'
import {
  Layers,
  Paintbrush,
  Sparkles,
  Link2,
  Plus,
  Trash2,
  Download,
  Upload,
  Copy,
  FolderOpen,
  ChevronRight,
  GripVertical,
  Square,
} from 'lucide-react'

type TabKey = 'layout' | 'skin' | 'fx' | 'bindings'

interface TabDef {
  key: TabKey
  label: string
  icon: React.ReactNode
}

interface SelectOption {
  key: string
  label: string
}

const LAYOUT_OPTIONS: SelectOption[] = [
  { key: 'classic_vn', label: 'Classic VN' },
  { key: 'wide_v1', label: 'Wide V1' },
]

const SKIN_OPTIONS: SelectOption[] = [
  { key: 'neon_v0', label: 'Neon V0' },
  { key: 'soft_v1', label: 'Soft V1' },
]

const panelVariants = {
  hidden: { opacity: 0, x: 12 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.2 } },
  exit: { opacity: 0, x: -12, transition: { duration: 0.12 } },
}

function downloadJson(payload: unknown, filename: string): string {
  downloadJsonFile(payload, filename)
  return `Exported ${filename}`
}

async function copyJson(
  payload: unknown,
  label: string,
): Promise<string> {
  const text = JSON.stringify(payload, null, 2)
  if (!navigator?.clipboard) return 'Clipboard unavailable'
  try {
    await navigator.clipboard.writeText(text)
    return `Copied ${label} JSON`
  } catch (err) {
    return `Copy failed: ${(err as Error).message}`
  }
}

export default function StageEditorPage() {
  const store = useEditorStore()
  const importInputRef = useRef<HTMLInputElement>(null)

  const tabs = useMemo<TabDef[]>(
    () => [
      { key: 'layout', label: 'Layout', icon: <Layers size={16} /> },
      { key: 'skin', label: 'Skin', icon: <Paintbrush size={16} /> },
      { key: 'fx', label: 'FX', icon: <Sparkles size={16} /> },
      { key: 'bindings', label: 'Bindings', icon: <Link2 size={16} /> },
    ],
    [],
  )

  const activeTab = store.activeTab as TabKey

  const handleExportLayout = useCallback(() => {
    const msg = downloadJson(
      store.layoutSpec,
      `layout-${store.layoutSpec.layoutKey}.json`,
    )
    store.setStatusMessage(msg)
  }, [store])

  const handleExportSkin = useCallback(() => {
    const msg = downloadJson(
      store.skinSpec,
      `skin-${store.skinSpec.skinKey}.json`,
    )
    store.setStatusMessage(msg)
  }, [store])

  const handleCopyLayout = useCallback(async () => {
    const msg = await copyJson(
      store.layoutSpec,
      `layout ${store.layoutSpec.layoutKey}`.trim(),
    )
    store.setStatusMessage(msg)
  }, [store])

  const handleCopySkin = useCallback(async () => {
    const msg = await copyJson(
      store.skinSpec,
      `skin ${store.skinSpec.skinKey}`.trim(),
    )
    store.setStatusMessage(msg)
  }, [store])

  const handleImport = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return
      const text = await file.text()
      try {
        const json = JSON.parse(text) as Record<string, unknown>
        if (json['layoutKey']) {
          const layout = json as unknown as StageLayoutSpec
          store.setLayoutSpec(layout)
          store.setStatusMessage('Layout imported')
        } else if (json['skinKey']) {
          const skin = json as unknown as StageSkinSpec
          store.setSkinSpec(skin)
          store.syncBindingsFromSpec()
          store.setStatusMessage('Skin imported')
        } else {
          store.setStatusMessage('Unknown JSON format')
        }
      } catch (err) {
        store.setStatusMessage(`Import failed: ${(err as Error).message}`)
      } finally {
        if (importInputRef.current) importInputRef.current.value = ''
      }
    },
    [store],
  )

  const handleLoadSample = useCallback(() => {
    const layoutKey = store.selectedLayoutKey
    const skinKey = store.selectedSkinKey

    const defaultLayout: StageLayoutSpec = {
      layoutKey,
      viewport: { width: 1280, height: 720 },
      layers: [
        {
          id: 'layer-bg',
          name: 'Background',
          zIndex: 0,
          slots: [
            {
              id: 'slot-bg-main',
              name: 'BG Main',
              anchor: 'center',
              offset: { x: 0, y: 0 },
              size: { widthPct: 100, heightPct: 100 },
            },
          ],
        },
        {
          id: 'layer-chars',
          name: 'Characters',
          zIndex: 10,
          slots: [
            {
              id: 'slot-char-left',
              name: 'Char Left',
              anchor: 'bottom-left',
              offset: { x: 100, y: 0 },
              size: { widthPx: 300, heightPx: 500 },
            },
            {
              id: 'slot-char-right',
              name: 'Char Right',
              anchor: 'bottom-right',
              offset: { x: 100, y: 0 },
              size: { widthPx: 300, heightPx: 500 },
            },
          ],
        },
      ],
    }

    const defaultSkin: StageSkinSpec = {
      skinKey,
      name: skinKey,
      performanceTier: 'high',
      transitions: [
        { id: 'transition-1', type: 'fade', duration: 320, easing: 'ease-out', delay: 0 },
      ],
      fxPresets: [
        { id: 'preset-1', effects: [{ type: 'bloomGlow', intensity: 0.3, enabled: true }] },
      ],
      bindings: { components: {}, events: {}, states: {} },
    }

    store.applySample(defaultLayout, defaultSkin)
  }, [store])

  return (
    <div
      className="flex min-h-screen flex-col gap-4 p-6"
      style={{ color: 'var(--ui-text)' }}
    >
      {/* Toolbar */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"
        style={{
          background: 'var(--ui-panel-glass)',
          borderColor: 'var(--ui-panel-glass-border)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="flex flex-wrap gap-2">
          <ToolbarButton icon={<FolderOpen size={14} />} label="Load Sample" onClick={handleLoadSample} />
          <ToolbarButton icon={<Upload size={14} />} label="Import JSON" onClick={() => importInputRef.current?.click()} />
          <ToolbarButton icon={<Download size={14} />} label="Export Layout" onClick={handleExportLayout} />
          <ToolbarButton icon={<Download size={14} />} label="Export Skin" onClick={handleExportSkin} />
        </div>
        <span className="text-xs" style={{ color: 'var(--ui-muted)' }}>
          {store.statusMessage}
        </span>
      </div>

      {/* Main 3-column layout */}
      <div className="grid flex-1 grid-cols-[240px_320px_minmax(0,1fr)] items-start gap-4 max-xl:grid-cols-1">
        {/* Left Rail */}
        <div className="flex flex-col gap-3">
          {/* Sample Selector */}
          <div
            className="flex flex-col gap-3 rounded-xl border p-4"
            style={{
              background: 'var(--ui-panel-glass)',
              borderColor: 'var(--ui-panel-glass-border)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <span
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: 'var(--ui-muted)' }}
            >
              Presets
            </span>
            <label className="flex flex-col gap-1">
              <span className="text-[10px]" style={{ color: 'var(--ui-muted)' }}>
                Layout
              </span>
              <StyledSelect
                value={store.selectedLayoutKey}
                options={LAYOUT_OPTIONS}
                onChange={store.setSelectedLayoutKey}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px]" style={{ color: 'var(--ui-muted)' }}>
                Skin
              </span>
              <StyledSelect
                value={store.selectedSkinKey}
                options={SKIN_OPTIONS}
                onChange={store.setSelectedSkinKey}
              />
            </label>
            <button
              type="button"
              className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-all hover:opacity-80"
              style={{
                background: 'var(--ui-primary-soft)',
                borderColor: 'var(--ui-primary)',
                color: 'var(--ui-primary)',
              }}
              onClick={handleLoadSample}
            >
              Apply Preset
            </button>
          </div>

          {/* Config Exporter */}
          <div
            className="flex flex-col gap-2 rounded-xl border p-4"
            style={{
              background: 'var(--ui-panel-glass)',
              borderColor: 'var(--ui-panel-glass-border)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <span
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: 'var(--ui-muted)' }}
            >
              Export
            </span>
            <div className="grid grid-cols-2 gap-2">
              <SmallButton icon={<Download size={12} />} label="Layout" onClick={handleExportLayout} />
              <SmallButton icon={<Download size={12} />} label="Skin" onClick={handleExportSkin} />
              <SmallButton icon={<Copy size={12} />} label="Copy Layout" onClick={handleCopyLayout} />
              <SmallButton icon={<Copy size={12} />} label="Copy Skin" onClick={handleCopySkin} />
            </div>
          </div>

          {/* Tab Sidebar */}
          <nav
            className="flex flex-col gap-1 rounded-xl border p-3"
            style={{
              background: 'var(--ui-panel-glass)',
              borderColor: 'var(--ui-panel-glass-border)',
              backdropFilter: 'blur(12px)',
            }}
          >
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-all"
                style={{
                  background:
                    activeTab === tab.key
                      ? 'var(--ui-primary-soft)'
                      : 'transparent',
                  color:
                    activeTab === tab.key
                      ? 'var(--ui-primary)'
                      : 'var(--ui-text)',
                }}
                onClick={() => store.setActiveTab(tab.key)}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Center Panel */}
        <div
          className="min-h-[520px] overflow-y-auto rounded-xl border p-4"
          style={{
            background: 'var(--ui-panel-glass)',
            borderColor: 'var(--ui-panel-glass-border)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <AnimatePresence mode="wait">
            {activeTab === 'layout' && (
              <motion.div
                key="layout"
                variants={panelVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <LayoutPanel
                  layoutSpec={store.layoutSpec}
                  selectedLayerId={store.selectedLayerId}
                  selectedSlotId={store.selectedSlotId}
                  onSelectLayer={store.selectLayer}
                  onSelectSlot={store.selectSlot}
                  onAddLayer={store.addLayer}
                  onRemoveLayer={store.removeLayer}
                  onAddSlot={store.addSlot}
                  onRemoveSlot={store.removeSlot}
                />
              </motion.div>
            )}
            {activeTab === 'skin' && (
              <motion.div
                key="skin"
                variants={panelVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <SkinPanel
                  skinSpec={store.skinSpec}
                  selectedTransitionId={store.selectedTransitionId}
                  onSelectTransition={store.setSelectedTransitionId}
                  onAddTransition={store.addTransition}
                  onRemoveTransition={store.removeTransition}
                />
              </motion.div>
            )}
            {activeTab === 'fx' && (
              <motion.div
                key="fx"
                variants={panelVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <FxPanel
                  fxPresets={store.skinSpec.fxPresets ?? []}
                  selectedPresetId={store.selectedFxId}
                  onSelectPreset={store.setSelectedFxId}
                  onAddPreset={store.addFxPreset}
                  onRemovePreset={store.removeFxPreset}
                  onAddEffect={store.addFxEffect}
                  onRemoveEffect={store.removeFxEffect}
                />
              </motion.div>
            )}
            {activeTab === 'bindings' && (
              <motion.div
                key="bindings"
                variants={panelVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <BindingPanel
                  componentBindings={store.componentBindings}
                  eventBindings={store.eventBindings}
                  stateBindings={store.stateBindings}
                  onAddBinding={store.addBinding}
                  onRemoveBinding={store.removeBinding}
                  onUpdateBinding={store.updateBinding}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Canvas */}
        <CanvasPreview
          layoutSpec={store.layoutSpec}
          selectedSlotId={store.selectedSlotId}
          onSelectSlot={store.selectSlot}
          onUpdateSlot={store.updateSlot}
        />
      </div>

      <input
        ref={importInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={handleImport}
      />
    </div>
  )
}

// ---- Sub-components ----

function ToolbarButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all hover:opacity-80"
      style={{
        background: 'var(--ui-panel)',
        borderColor: 'var(--ui-border)',
        color: 'var(--ui-text)',
      }}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  )
}

function SmallButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className="flex items-center justify-center gap-1 rounded-md border px-2 py-1.5 text-[10px] font-medium transition-all hover:opacity-80"
      style={{
        background: 'var(--ui-panel-subtle)',
        borderColor: 'var(--ui-border)',
        color: 'var(--ui-text)',
      }}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  )
}

function StyledSelect({
  value,
  options,
  onChange,
}: {
  value: string
  options: SelectOption[]
  onChange: (val: string) => void
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border px-2 py-1.5 text-xs"
      style={{
        background: 'var(--ui-panel)',
        borderColor: 'var(--ui-border)',
        color: 'var(--ui-text)',
      }}
    >
      {options.map((opt) => (
        <option key={opt.key} value={opt.key}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

function PanelHeader({ title }: { title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span
        className="h-4 w-1 rounded-full"
        style={{ background: 'var(--ui-primary)' }}
      />
      <h3
        className="m-0 text-sm font-bold"
        style={{ color: 'var(--ui-text)' }}
      >
        {title}
      </h3>
    </div>
  )
}

// ---- Layout Panel ----

function LayoutPanel({
  layoutSpec,
  selectedLayerId,
  selectedSlotId,
  onSelectLayer,
  onSelectSlot,
  onAddLayer,
  onRemoveLayer,
  onAddSlot,
  onRemoveSlot,
}: {
  layoutSpec: StageLayoutSpec
  selectedLayerId: string
  selectedSlotId: string
  onSelectLayer: (id: string) => void
  onSelectSlot: (id: string) => void
  onAddLayer: () => void
  onRemoveLayer: (id: string) => void
  onAddSlot: (layerId: string) => void
  onRemoveSlot: (layerId: string, slotId: string) => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <PanelHeader title="Layout" />

      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: 'var(--ui-muted)' }}>
          Layers ({layoutSpec.layers.length})
        </span>
        <button
          type="button"
          className="flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-medium transition-all hover:opacity-80"
          style={{
            background: 'var(--ui-primary-soft)',
            borderColor: 'var(--ui-primary)',
            color: 'var(--ui-primary)',
          }}
          onClick={onAddLayer}
        >
          <Plus size={10} />
          Add Layer
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {layoutSpec.layers.map((layer) => (
          <div
            key={layer.id}
            className="rounded-lg border"
            style={{
              background:
                layer.id === selectedLayerId
                  ? 'var(--ui-primary-soft)'
                  : 'var(--ui-panel-subtle)',
              borderColor:
                layer.id === selectedLayerId
                  ? 'var(--ui-primary)'
                  : 'var(--ui-border)',
            }}
          >
            <div
              className="flex cursor-pointer items-center gap-2 px-3 py-2"
              onClick={() => onSelectLayer(layer.id)}
            >
              <GripVertical size={12} style={{ color: 'var(--ui-muted)' }} />
              <Layers size={12} style={{ color: 'var(--ui-primary)' }} />
              <span className="flex-1 text-xs font-medium" style={{ color: 'var(--ui-text)' }}>
                {layer.name}
              </span>
              <span className="text-[10px]" style={{ color: 'var(--ui-muted)' }}>
                z:{layer.zIndex}
              </span>
              <button
                type="button"
                className="rounded p-0.5 transition-all hover:opacity-70"
                style={{ color: 'var(--ui-danger)' }}
                onClick={(e) => {
                  e.stopPropagation()
                  onRemoveLayer(layer.id)
                }}
              >
                <Trash2 size={12} />
              </button>
            </div>

            {layer.id === selectedLayerId && (
              <div className="border-t px-3 pb-2 pt-2" style={{ borderColor: 'var(--ui-border)' }}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[10px]" style={{ color: 'var(--ui-muted)' }}>
                    Slots ({layer.slots.length})
                  </span>
                  <button
                    type="button"
                    className="flex items-center gap-0.5 text-[10px] font-medium transition-all hover:opacity-80"
                    style={{ color: 'var(--ui-primary)' }}
                    onClick={() => onAddSlot(layer.id)}
                  >
                    <Plus size={10} />
                    Add
                  </button>
                </div>
                <div className="flex flex-col gap-1">
                  {layer.slots.map((slot) => (
                    <div
                      key={slot.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5"
                      style={{
                        background:
                          slot.id === selectedSlotId
                            ? 'color-mix(in srgb, var(--ui-primary) 15%, transparent)'
                            : 'transparent',
                        borderColor:
                          slot.id === selectedSlotId
                            ? 'var(--ui-primary)'
                            : 'var(--ui-border)',
                      }}
                      onClick={() => onSelectSlot(slot.id)}
                    >
                      <Square size={10} style={{ color: 'var(--ui-muted)' }} />
                      <span className="flex-1 text-[10px]" style={{ color: 'var(--ui-text)' }}>
                        {slot.name}
                      </span>
                      <span className="text-[9px]" style={{ color: 'var(--ui-muted)' }}>
                        {slot.size?.widthPx ?? slot.size?.widthPct ?? '?'}x
                        {slot.size?.heightPx ?? slot.size?.heightPct ?? '?'}
                      </span>
                      <button
                        type="button"
                        className="rounded p-0.5 transition-all hover:opacity-70"
                        style={{ color: 'var(--ui-danger)' }}
                        onClick={(e) => {
                          e.stopPropagation()
                          onRemoveSlot(layer.id, slot.id)
                        }}
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}
                  {layer.slots.length === 0 && (
                    <p className="py-2 text-center text-[10px] italic" style={{ color: 'var(--ui-muted)' }}>
                      No slots
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        {layoutSpec.layers.length === 0 && (
          <p className="py-4 text-center text-xs italic" style={{ color: 'var(--ui-muted)' }}>
            No layers. Click &quot;Add Layer&quot; to begin.
          </p>
        )}
      </div>
    </div>
  )
}

// ---- Skin Panel ----

function SkinPanel({
  skinSpec,
  selectedTransitionId,
  onSelectTransition,
  onAddTransition,
  onRemoveTransition,
}: {
  skinSpec: StageSkinSpec
  selectedTransitionId: string
  onSelectTransition: (id: string) => void
  onAddTransition: () => void
  onRemoveTransition: (id: string) => void
}) {
  const transitions = skinSpec.transitions ?? []

  return (
    <div className="flex flex-col gap-4">
      <PanelHeader title="Skin" />

      <div className="flex flex-col gap-2 rounded-lg border p-3" style={{ background: 'var(--ui-panel-subtle)', borderColor: 'var(--ui-border)' }}>
        <DetailRow label="Key" value={skinSpec.skinKey} />
        <DetailRow label="Name" value={skinSpec.name ?? '-'} />
        <DetailRow label="Perf Tier" value={skinSpec.performanceTier ?? 'high'} />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: 'var(--ui-muted)' }}>
          Transitions ({transitions.length})
        </span>
        <button
          type="button"
          className="flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-medium transition-all hover:opacity-80"
          style={{
            background: 'var(--ui-primary-soft)',
            borderColor: 'var(--ui-primary)',
            color: 'var(--ui-primary)',
          }}
          onClick={onAddTransition}
        >
          <Plus size={10} />
          Add
        </button>
      </div>

      <div className="flex flex-col gap-1">
        {transitions.map((tr) => (
          <div
            key={tr.id}
            className="flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5"
            style={{
              background:
                tr.id === selectedTransitionId
                  ? 'var(--ui-primary-soft)'
                  : 'var(--ui-panel-subtle)',
              borderColor:
                tr.id === selectedTransitionId
                  ? 'var(--ui-primary)'
                  : 'var(--ui-border)',
            }}
            onClick={() => onSelectTransition(tr.id)}
          >
            <ChevronRight size={10} style={{ color: 'var(--ui-primary)' }} />
            <span className="flex-1 text-[10px]" style={{ color: 'var(--ui-text)' }}>
              {tr.type} / {tr.duration}ms / {tr.easing}
            </span>
            <button
              type="button"
              className="rounded p-0.5 transition-all hover:opacity-70"
              style={{ color: 'var(--ui-danger)' }}
              onClick={(e) => {
                e.stopPropagation()
                onRemoveTransition(tr.id)
              }}
            >
              <Trash2 size={10} />
            </button>
          </div>
        ))}
        {transitions.length === 0 && (
          <p className="py-4 text-center text-xs italic" style={{ color: 'var(--ui-muted)' }}>
            No transitions
          </p>
        )}
      </div>
    </div>
  )
}

// ---- FX Panel ----

function FxPanel({
  fxPresets,
  selectedPresetId,
  onSelectPreset,
  onAddPreset,
  onRemovePreset,
  onAddEffect,
  onRemoveEffect,
}: {
  fxPresets: { id: string; effects: { type: string; intensity: number; enabled: boolean }[] }[]
  selectedPresetId: string
  onSelectPreset: (id: string) => void
  onAddPreset: () => void
  onRemovePreset: (id: string) => void
  onAddEffect: (presetId: string) => void
  onRemoveEffect: (presetId: string, index: number) => void
}) {
  const selectedPreset = useMemo(
    () => fxPresets.find((p) => p.id === selectedPresetId) ?? null,
    [fxPresets, selectedPresetId],
  )

  return (
    <div className="flex flex-col gap-4">
      <PanelHeader title="FX Presets" />

      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: 'var(--ui-muted)' }}>
          Presets ({fxPresets.length})
        </span>
        <button
          type="button"
          className="flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-medium transition-all hover:opacity-80"
          style={{
            background: 'var(--ui-primary-soft)',
            borderColor: 'var(--ui-primary)',
            color: 'var(--ui-primary)',
          }}
          onClick={onAddPreset}
        >
          <Plus size={10} />
          Add Preset
        </button>
      </div>

      <div className="flex flex-col gap-1">
        {fxPresets.map((preset) => (
          <div
            key={preset.id}
            className="flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5"
            style={{
              background:
                preset.id === selectedPresetId
                  ? 'var(--ui-primary-soft)'
                  : 'var(--ui-panel-subtle)',
              borderColor:
                preset.id === selectedPresetId
                  ? 'var(--ui-primary)'
                  : 'var(--ui-border)',
            }}
            onClick={() => onSelectPreset(preset.id)}
          >
            <Sparkles size={10} style={{ color: 'var(--ui-primary)' }} />
            <span className="flex-1 text-[10px]" style={{ color: 'var(--ui-text)' }}>
              {preset.id} ({preset.effects.length} effects)
            </span>
            <button
              type="button"
              className="rounded p-0.5 transition-all hover:opacity-70"
              style={{ color: 'var(--ui-danger)' }}
              onClick={(e) => {
                e.stopPropagation()
                onRemovePreset(preset.id)
              }}
            >
              <Trash2 size={10} />
            </button>
          </div>
        ))}
      </div>

      {selectedPreset && (
        <div className="rounded-lg border p-3" style={{ background: 'var(--ui-panel-subtle)', borderColor: 'var(--ui-border)' }}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--ui-muted)' }}>
              Effects
            </span>
            <button
              type="button"
              className="flex items-center gap-0.5 text-[10px] font-medium"
              style={{ color: 'var(--ui-primary)' }}
              onClick={() => onAddEffect(selectedPreset.id)}
            >
              <Plus size={10} />
              Add Effect
            </button>
          </div>
          <div className="flex flex-col gap-1">
            {selectedPreset.effects.map((fx, index) => (
              <div
                key={index}
                className="flex items-center gap-2 rounded-md border px-2 py-1"
                style={{
                  background: 'var(--ui-panel)',
                  borderColor: 'var(--ui-border)',
                }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{
                    background: fx.enabled ? 'var(--ui-success)' : 'var(--ui-muted)',
                  }}
                />
                <span className="flex-1 text-[10px]" style={{ color: 'var(--ui-text)' }}>
                  {fx.type} (intensity: {fx.intensity})
                </span>
                <button
                  type="button"
                  className="rounded p-0.5 transition-all hover:opacity-70"
                  style={{ color: 'var(--ui-danger)' }}
                  onClick={() => onRemoveEffect(selectedPreset.id, index)}
                >
                  <Trash2 size={10} />
                </button>
              </div>
            ))}
            {selectedPreset.effects.length === 0 && (
              <p className="py-2 text-center text-[10px] italic" style={{ color: 'var(--ui-muted)' }}>
                No effects
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ---- Binding Panel ----

function BindingPanel({
  componentBindings,
  eventBindings,
  stateBindings,
  onAddBinding,
  onRemoveBinding,
  onUpdateBinding,
}: {
  componentBindings: BindingEntry[]
  eventBindings: BindingEntry[]
  stateBindings: BindingEntry[]
  onAddBinding: (type: 'components' | 'events' | 'states') => void
  onRemoveBinding: (type: 'components' | 'events' | 'states', index: number) => void
  onUpdateBinding: (type: 'components' | 'events' | 'states', index: number, entry: BindingEntry) => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <PanelHeader title="Bindings" />
      <BindingSection
        title="Components"
        type="components"
        entries={componentBindings}
        onAdd={onAddBinding}
        onRemove={onRemoveBinding}
        onUpdate={onUpdateBinding}
      />
      <BindingSection
        title="Events"
        type="events"
        entries={eventBindings}
        onAdd={onAddBinding}
        onRemove={onRemoveBinding}
        onUpdate={onUpdateBinding}
      />
      <BindingSection
        title="States"
        type="states"
        entries={stateBindings}
        onAdd={onAddBinding}
        onRemove={onRemoveBinding}
        onUpdate={onUpdateBinding}
      />
    </div>
  )
}

function BindingSection({
  title,
  type,
  entries,
  onAdd,
  onRemove,
  onUpdate,
}: {
  title: string
  type: 'components' | 'events' | 'states'
  entries: BindingEntry[]
  onAdd: (type: 'components' | 'events' | 'states') => void
  onRemove: (type: 'components' | 'events' | 'states', index: number) => void
  onUpdate: (type: 'components' | 'events' | 'states', index: number, entry: BindingEntry) => void
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--ui-muted)' }}>
          {title}
        </span>
        <button
          type="button"
          className="flex items-center gap-0.5 text-[10px] font-medium"
          style={{ color: 'var(--ui-primary)' }}
          onClick={() => onAdd(type)}
        >
          <Plus size={10} />
          Add
        </button>
      </div>
      <div className="flex flex-col gap-1">
        {entries.map((entry, index) => (
          <div
            key={index}
            className="flex items-center gap-1 rounded-md border px-2 py-1"
            style={{
              background: 'var(--ui-panel-subtle)',
              borderColor: 'var(--ui-border)',
            }}
          >
            <input
              type="text"
              value={entry.key}
              onChange={(e) =>
                onUpdate(type, index, { ...entry, key: e.target.value })
              }
              placeholder="key"
              className="w-0 flex-1 rounded border-none bg-transparent px-1 py-0.5 text-[10px] outline-none"
              style={{ color: 'var(--ui-text)' }}
            />
            <span className="text-[10px]" style={{ color: 'var(--ui-muted)' }}>
              :
            </span>
            <input
              type="text"
              value={entry.value}
              onChange={(e) =>
                onUpdate(type, index, { ...entry, value: e.target.value })
              }
              placeholder="value"
              className="w-0 flex-1 rounded border-none bg-transparent px-1 py-0.5 text-[10px] outline-none"
              style={{ color: 'var(--ui-text)' }}
            />
            <button
              type="button"
              className="rounded p-0.5 transition-all hover:opacity-70"
              style={{ color: 'var(--ui-danger)' }}
              onClick={() => onRemove(type, index)}
            >
              <Trash2 size={10} />
            </button>
          </div>
        ))}
        {entries.length === 0 && (
          <p className="py-1 text-center text-[10px] italic" style={{ color: 'var(--ui-muted)' }}>
            No bindings
          </p>
        )}
      </div>
    </div>
  )
}

// ---- Canvas Preview ----

function CanvasPreview({
  layoutSpec,
  selectedSlotId,
  onSelectSlot,
  onUpdateSlot,
}: {
  layoutSpec: StageLayoutSpec
  selectedSlotId: string
  onSelectSlot: (id: string) => void
  onUpdateSlot: (payload: {
    id: string
    offset?: { x: number; y: number }
    size?: { widthPx?: number; heightPx?: number }
  }) => void
}) {
  const [, setDragging] = useState<{
    id: string
    startX: number
    startY: number
    originX: number
    originY: number
  } | null>(null)
  const [, setResizing] = useState<{
    id: string
    startX: number
    startY: number
    originW: number
    originH: number
  } | null>(null)

  const viewport = useMemo(
    () => ({
      width: layoutSpec.viewport?.width ?? 1280,
      height: layoutSpec.viewport?.height ?? 720,
    }),
    [layoutSpec.viewport],
  )

  const slots = useMemo(
    () => layoutSpec.layers.flatMap((layer) => layer.slots),
    [layoutSpec.layers],
  )

  const slotStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {}
    slots.forEach((slot) => {
      const anchor = slot.anchor ?? 'center'
      const offsetX = slot.offset?.x ?? 0
      const offsetY = slot.offset?.y ?? 0
      const w = slot.size?.widthPx
      const h = slot.size?.heightPx
      const wPct = slot.size?.widthPct
      const hPct = slot.size?.heightPct
      styles[slot.id] = {
        position: 'absolute',
        left: anchor.includes('right') ? undefined : `${offsetX}px`,
        right: anchor.includes('right') ? `${-offsetX}px` : undefined,
        top: anchor.includes('bottom') ? undefined : `${offsetY}px`,
        bottom: anchor.includes('bottom') ? `${-offsetY}px` : undefined,
        width: w ? `${w}px` : wPct ? `${wPct}%` : '200px',
        height: h ? `${h}px` : hPct ? `${hPct}%` : '200px',
      }
    })
    return styles
  }, [slots])

  const handleDrag = useCallback(
    (e: PointerEvent) => {
      setDragging((prev) => {
        if (!prev) return prev
        onUpdateSlot({
          id: prev.id,
          offset: {
            x: prev.originX + (e.clientX - prev.startX),
            y: prev.originY + (e.clientY - prev.startY),
          },
        })
        return prev
      })
    },
    [onUpdateSlot],
  )

  const stopDrag = useCallback(() => {
    setDragging(null)
  }, [])

  const handleResize = useCallback(
    (e: PointerEvent) => {
      setResizing((prev) => {
        if (!prev) return prev
        onUpdateSlot({
          id: prev.id,
          size: {
            widthPx: Math.max(80, prev.originW + (e.clientX - prev.startX)),
            heightPx: Math.max(80, prev.originH + (e.clientY - prev.startY)),
          },
        })
        return prev
      })
    },
    [onUpdateSlot],
  )

  const stopResize = useCallback(() => {
    setResizing(null)
  }, [])

  // Use refs so window event listeners always call the latest handler
  const handleDragRef = useRef(handleDrag)
  handleDragRef.current = handleDrag
  const stopDragRef = useRef(stopDrag)
  stopDragRef.current = stopDrag
  const handleResizeRef = useRef(handleResize)
  handleResizeRef.current = handleResize
  const stopResizeRef = useRef(stopResize)
  stopResizeRef.current = stopResize

  const startDrag = useCallback(
    (e: React.PointerEvent, slot: StageLayoutSlot) => {
      if ((e.target as HTMLElement).classList.contains('resize-handle')) return
      setDragging({
        id: slot.id,
        startX: e.clientX,
        startY: e.clientY,
        originX: slot.offset?.x ?? 0,
        originY: slot.offset?.y ?? 0,
      })
      const onMove = (ev: PointerEvent) => handleDragRef.current(ev)
      const onUp = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        stopDragRef.current()
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [],
  )

  const startResize = useCallback(
    (e: React.PointerEvent, slot: StageLayoutSlot) => {
      e.stopPropagation()
      setResizing({
        id: slot.id,
        startX: e.clientX,
        startY: e.clientY,
        originW: slot.size?.widthPx ?? 200,
        originH: slot.size?.heightPx ?? 200,
      })
      const onMove = (ev: PointerEvent) => handleResizeRef.current(ev)
      const onUp = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        stopResizeRef.current()
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [],
  )

  return (
    <div
      className="flex items-center justify-center rounded-xl border border-dashed p-4"
      style={{
        background: 'var(--ui-panel-subtle)',
        borderColor: 'var(--ui-border)',
      }}
    >
      <div
        className="relative overflow-hidden rounded-lg border"
        style={{
          width: '100%',
          maxWidth: 960,
          aspectRatio: `${viewport.width} / ${viewport.height}`,
          background: 'var(--ui-panel)',
          borderColor: 'var(--ui-border)',
          boxShadow: 'var(--ui-shadow-soft)',
        }}
      >
        {slots.map((slot) => {
          const isSelected = slot.id === selectedSlotId
          return (
            <div
              key={slot.id}
              className="box-border cursor-move rounded-sm border p-1.5"
              style={{
                ...slotStyles[slot.id],
                borderColor: isSelected
                  ? 'var(--ui-primary)'
                  : 'color-mix(in srgb, var(--ui-primary) 40%, transparent)',
                background: isSelected
                  ? 'color-mix(in srgb, var(--ui-primary) 15%, transparent)'
                  : 'color-mix(in srgb, var(--ui-primary) 5%, transparent)',
                boxShadow: isSelected ? '0 0 8px color-mix(in srgb, var(--ui-primary) 30%, transparent)' : 'none',
              }}
              onPointerDown={(e) => startDrag(e, slot)}
              onClick={(e) => {
                e.stopPropagation()
                onSelectSlot(slot.id)
              }}
            >
              <span
                className="text-[10px]"
                style={{ color: 'var(--ui-muted)' }}
              >
                {slot.name}
              </span>
              <span
                className="resize-handle absolute bottom-1 right-1 h-3 w-3 cursor-nwse-resize rounded"
                style={{ background: 'var(--ui-primary)' }}
                onPointerDown={(e) => startResize(e, slot)}
              />
            </div>
          )
        })}

        {slots.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-xs italic" style={{ color: 'var(--ui-muted)' }}>
              Load a sample to see the canvas preview
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="min-w-[60px] text-[10px] font-medium uppercase"
        style={{ color: 'var(--ui-muted)' }}
      >
        {label}
      </span>
      <span className="text-xs" style={{ color: 'var(--ui-text)' }}>
        {value}
      </span>
    </div>
  )
}
