import { create } from 'zustand'

// ---------------------------------------------------------------------------
// Types (mirrors v1 stageConfig.types)
// ---------------------------------------------------------------------------

export interface StageLayoutSlot {
  id: string
  name: string
  anchor?: string
  offset?: { x: number; y: number }
  size?: { widthPx?: number; heightPx?: number; widthPct?: number; heightPct?: number }
}

export interface StageLayoutLayer {
  id: string
  name: string
  zIndex: number
  slots: StageLayoutSlot[]
}

export interface StageLayoutSpec {
  layoutKey: string
  viewport?: { width: number; height: number }
  layers: StageLayoutLayer[]
}

export interface TransitionSpec {
  id: string
  type: string
  duration: number
  easing: string
  delay: number
}

export interface FxEffect {
  type: string
  intensity: number
  enabled: boolean
}

export interface FxPresetSpec {
  id: string
  effects: FxEffect[]
}

export interface StageSkinSpec {
  skinKey: string
  name?: string
  theme?: string
  performanceTier?: 'low' | 'mid' | 'high'
  transitions?: TransitionSpec[]
  fxPresets?: FxPresetSpec[]
  bindings?: {
    components?: Record<string, string>
    events?: Record<string, string>
    states?: Record<string, string>
  }
}

export interface BindingEntry {
  key: string
  value: string
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

interface EditorState {
  // Data
  layoutSpec: StageLayoutSpec
  skinSpec: StageSkinSpec

  // Selection state
  activeTab: string
  selectedLayerId: string
  selectedSlotId: string
  selectedTransitionId: string
  selectedFxId: string
  statusMessage: string
  selectedLayoutKey: string
  selectedSkinKey: string

  // Bindings
  componentBindings: BindingEntry[]
  eventBindings: BindingEntry[]
  stateBindings: BindingEntry[]

  // Actions – Layout
  setLayoutSpec: (spec: StageLayoutSpec) => void
  setSkinSpec: (spec: StageSkinSpec) => void
  setActiveTab: (tab: string) => void
  selectLayer: (id: string) => void
  selectSlot: (id: string) => void
  addLayer: () => void
  removeLayer: (id: string) => void
  addSlot: (layerId: string) => void
  removeSlot: (layerId: string, slotId: string) => void
  updateSlot: (payload: { id: string; offset?: { x: number; y: number }; size?: { widthPx?: number; heightPx?: number } }) => void

  // Actions – Skin
  setSelectedTransitionId: (id: string) => void
  addTransition: () => void
  removeTransition: (id: string) => void

  // Actions – FX
  setSelectedFxId: (id: string) => void
  addFxPreset: () => void
  removeFxPreset: (id: string) => void
  addFxEffect: (presetId: string) => void
  removeFxEffect: (presetId: string, index: number) => void

  // Actions – Bindings
  addBinding: (type: 'components' | 'events' | 'states') => void
  removeBinding: (type: 'components' | 'events' | 'states', index: number) => void
  updateBinding: (type: 'components' | 'events' | 'states', index: number, entry: BindingEntry) => void
  syncBindingsFromSpec: () => void

  // Actions – Status / Import / Export
  setStatusMessage: (msg: string) => void
  setSelectedLayoutKey: (key: string) => void
  setSelectedSkinKey: (key: string) => void
  applySample: (layout: StageLayoutSpec, skin: StageSkinSpec) => void
}

function ensureSlotDefaults(slot: StageLayoutSlot): StageLayoutSlot {
  return {
    ...slot,
    offset: { x: slot.offset?.x ?? 0, y: slot.offset?.y ?? 0 },
    size: {
      widthPx: slot.size?.widthPx ?? (slot.size?.widthPct === undefined ? 200 : undefined),
      heightPx: slot.size?.heightPx ?? (slot.size?.heightPct === undefined ? 200 : undefined),
      widthPct: slot.size?.widthPct,
      heightPct: slot.size?.heightPct,
    },
  }
}

const defaultLayout: StageLayoutSpec = {
  layoutKey: 'classic_vn',
  viewport: { width: 1280, height: 720 },
  layers: [],
}

const defaultSkin: StageSkinSpec = {
  skinKey: 'neon_v0',
  name: '',
  theme: '',
  performanceTier: 'high',
  transitions: [],
  fxPresets: [],
  bindings: { components: {}, events: {}, states: {} },
}

export const useEditorStore = create<EditorState>((set, get) => ({
  layoutSpec: defaultLayout,
  skinSpec: defaultSkin,
  activeTab: 'layout',
  selectedLayerId: '',
  selectedSlotId: '',
  selectedTransitionId: '',
  selectedFxId: '',
  statusMessage: 'Ready',
  selectedLayoutKey: 'classic_vn',
  selectedSkinKey: 'neon_v0',
  componentBindings: [],
  eventBindings: [],
  stateBindings: [],

  setLayoutSpec: (spec) => set({ layoutSpec: spec }),
  setSkinSpec: (spec) => set({ skinSpec: spec }),
  setActiveTab: (tab) => set({ activeTab: tab }),

  selectLayer: (id) => {
    const layer = get().layoutSpec.layers.find((l) => l.id === id)
    set({
      selectedLayerId: id,
      selectedSlotId: layer?.slots[0]?.id ?? '',
    })
  },

  selectSlot: (id) => set({ selectedSlotId: id }),

  addLayer: () => {
    const { layoutSpec } = get()
    const id = `layer-${Date.now()}`
    const newLayer: StageLayoutLayer = {
      id,
      name: `Layer ${layoutSpec.layers.length + 1}`,
      zIndex: 0,
      slots: [],
    }
    set({
      layoutSpec: { ...layoutSpec, layers: [...layoutSpec.layers, newLayer] },
      selectedLayerId: id,
      selectedSlotId: '',
    })
  },

  removeLayer: (id) => {
    const { layoutSpec } = get()
    const next = layoutSpec.layers.filter((l) => l.id !== id)
    set({
      layoutSpec: { ...layoutSpec, layers: next },
      selectedLayerId: next[0]?.id ?? '',
      selectedSlotId: next[0]?.slots[0]?.id ?? '',
    })
  },

  addSlot: (layerId) => {
    const { layoutSpec } = get()
    const layers = layoutSpec.layers.map((layer) => {
      if (layer.id !== layerId) return layer
      const slotId = `slot-${Date.now()}`
      return {
        ...layer,
        slots: [
          ...layer.slots,
          ensureSlotDefaults({
            id: slotId,
            name: `Slot ${layer.slots.length + 1}`,
            anchor: 'center',
          }),
        ],
      }
    })
    const newSlot = layers.find((l) => l.id === layerId)?.slots.at(-1)
    set({
      layoutSpec: { ...layoutSpec, layers },
      selectedSlotId: newSlot?.id ?? get().selectedSlotId,
    })
  },

  removeSlot: (layerId, slotId) => {
    const { layoutSpec } = get()
    const layers = layoutSpec.layers.map((layer) => {
      if (layer.id !== layerId) return layer
      return { ...layer, slots: layer.slots.filter((s) => s.id !== slotId) }
    })
    const layer = layers.find((l) => l.id === layerId)
    set({
      layoutSpec: { ...layoutSpec, layers },
      selectedSlotId: layer?.slots[0]?.id ?? '',
    })
  },

  updateSlot: (payload) => {
    const { layoutSpec } = get()
    const layers = layoutSpec.layers.map((layer) => ({
      ...layer,
      slots: layer.slots.map((slot) => {
        if (slot.id !== payload.id) return slot
        const s = ensureSlotDefaults(slot)
        return {
          ...s,
          offset: payload.offset ? { ...s.offset, ...payload.offset } : s.offset,
          size: payload.size ? { ...s.size, ...payload.size } : s.size,
        }
      }),
    }))
    set({ layoutSpec: { ...layoutSpec, layers } })
  },

  setSelectedTransitionId: (id) => set({ selectedTransitionId: id }),

  addTransition: () => {
    const { skinSpec } = get()
    const transitions = skinSpec.transitions ?? []
    const id = `transition-${transitions.length + 1}`
    const newTransition: TransitionSpec = { id, type: 'fade', duration: 320, easing: 'ease-out', delay: 0 }
    set({
      skinSpec: { ...skinSpec, transitions: [...transitions, newTransition] },
      selectedTransitionId: id,
    })
  },

  removeTransition: (id) => {
    const { skinSpec } = get()
    const transitions = (skinSpec.transitions ?? []).filter((t) => t.id !== id)
    set({
      skinSpec: { ...skinSpec, transitions },
      selectedTransitionId: transitions[0]?.id ?? '',
    })
  },

  setSelectedFxId: (id) => set({ selectedFxId: id }),

  addFxPreset: () => {
    const { skinSpec } = get()
    const presets = skinSpec.fxPresets ?? []
    const id = `preset-${presets.length + 1}`
    set({
      skinSpec: { ...skinSpec, fxPresets: [...presets, { id, effects: [] }] },
      selectedFxId: id,
    })
  },

  removeFxPreset: (id) => {
    const { skinSpec } = get()
    const presets = (skinSpec.fxPresets ?? []).filter((p) => p.id !== id)
    set({
      skinSpec: { ...skinSpec, fxPresets: presets },
      selectedFxId: presets[0]?.id ?? '',
    })
  },

  addFxEffect: (presetId) => {
    const { skinSpec } = get()
    const fxPresets = (skinSpec.fxPresets ?? []).map((p) => {
      if (p.id !== presetId) return p
      return { ...p, effects: [...p.effects, { type: 'bloomGlow', intensity: 0.3, enabled: true }] }
    })
    set({ skinSpec: { ...skinSpec, fxPresets } })
  },

  removeFxEffect: (presetId, index) => {
    const { skinSpec } = get()
    const fxPresets = (skinSpec.fxPresets ?? []).map((p) => {
      if (p.id !== presetId) return p
      return { ...p, effects: p.effects.filter((_, i) => i !== index) }
    })
    set({ skinSpec: { ...skinSpec, fxPresets } })
  },

  addBinding: (type) => {
    const newEntry: BindingEntry = { key: '', value: '' }
    switch (type) {
      case 'components':
        set({ componentBindings: [...get().componentBindings, newEntry] })
        break
      case 'events':
        set({ eventBindings: [...get().eventBindings, newEntry] })
        break
      case 'states':
        set({ stateBindings: [...get().stateBindings, newEntry] })
        break
    }
  },

  removeBinding: (type, index) => {
    switch (type) {
      case 'components':
        set({ componentBindings: get().componentBindings.filter((_, i) => i !== index) })
        break
      case 'events':
        set({ eventBindings: get().eventBindings.filter((_, i) => i !== index) })
        break
      case 'states':
        set({ stateBindings: get().stateBindings.filter((_, i) => i !== index) })
        break
    }
  },

  updateBinding: (type, index, entry) => {
    switch (type) {
      case 'components': {
        const list = [...get().componentBindings]
        list[index] = entry
        set({ componentBindings: list })
        break
      }
      case 'events': {
        const list = [...get().eventBindings]
        list[index] = entry
        set({ eventBindings: list })
        break
      }
      case 'states': {
        const list = [...get().stateBindings]
        list[index] = entry
        set({ stateBindings: list })
        break
      }
    }
  },

  syncBindingsFromSpec: () => {
    const { skinSpec } = get()
    const toEntries = (obj: Record<string, string> | undefined): BindingEntry[] =>
      Object.entries(obj ?? {}).map(([key, value]) => ({ key, value: String(value) }))
    set({
      componentBindings: toEntries(skinSpec.bindings?.components),
      eventBindings: toEntries(skinSpec.bindings?.events),
      stateBindings: toEntries(skinSpec.bindings?.states),
    })
  },

  setStatusMessage: (msg) => set({ statusMessage: msg }),
  setSelectedLayoutKey: (key) => set({ selectedLayoutKey: key }),
  setSelectedSkinKey: (key) => set({ selectedSkinKey: key }),

  applySample: (layout, skin) => {
    const l = JSON.parse(JSON.stringify(layout)) as StageLayoutSpec
    const s = JSON.parse(JSON.stringify(skin)) as StageSkinSpec
    set({
      layoutSpec: l,
      skinSpec: s,
      selectedLayerId: l.layers[0]?.id ?? '',
      selectedSlotId: l.layers[0]?.slots[0]?.id ?? '',
      selectedTransitionId: s.transitions?.[0]?.id ?? '',
      selectedFxId: s.fxPresets?.[0]?.id ?? '',
      statusMessage: 'Sample loaded',
    })
    get().syncBindingsFromSpec()
  },
}))
