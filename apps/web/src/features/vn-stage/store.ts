import { create } from 'zustand'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Mirrors engine Phase — includes 'idle' for pre-session state */
export type VnPhase = 'idle' | 'playing' | 'busy' | 'await_input' | 'await_choice' | 'ended'
export type VnMode = 'play' | 'replay'
export type InputTab = 'action' | 'talk'
export type SaveLoadTab = 'save' | 'load'

export interface SaveSlotRow {
  slotId: string
  title?: string
  updatedAt: string
  storyKey?: string
  preview?: {
    textSnippet?: string
    screenshotUrl?: string
    endingId?: string
  }
}

export interface StageFrame {
  bgUrl: string
  characters?: Array<{
    id: string
    poseUrl: string
    position?: 'left' | 'center' | 'right'
  }>
}

export interface ChoiceOption {
  optionId: string
  text: string
}

export interface ChoiceView {
  choiceId?: string
  options: ChoiceOption[]
}

export interface EndingInfo {
  endingId?: string
  type?: string
  title?: string
  subtitle?: string
}

// ---------------------------------------------------------------------------
// VN Stage UI Store  (UI-only state; engine state lives in useVnEngine hook)
// ---------------------------------------------------------------------------

export interface VnStageUIState {
  // Overlay visibility
  showBacklog: boolean
  showSystemMenu: boolean
  showCommandModal: boolean
  showSaveLoad: boolean
  showExitConfirm: boolean

  // Input
  inputTab: InputTab
  selectedActionId: string | null
  talkText: string

  // Save/Load
  saveLoadTab: SaveLoadTab
  saveModalError: string | null
  isSavingSlot: boolean
  loadingSlotId: string | null
  deletingSlotId: string | null
  replaySlotId: string | null
  isExitingAfterSave: boolean

  // Ending
  endingSaved: boolean

  // Thinking bubble
  thinkingVisible: boolean
  thinkingText: string
  thinkingTypewriter: boolean
}

export interface VnStageUIActions {
  setShowBacklog: (v: boolean) => void
  setShowSystemMenu: (v: boolean) => void
  setShowCommandModal: (v: boolean) => void
  setShowSaveLoad: (v: boolean) => void
  setShowExitConfirm: (v: boolean) => void

  setInputTab: (v: InputTab) => void
  setSelectedActionId: (v: string | null) => void
  setTalkText: (v: string) => void

  setSaveLoadTab: (v: SaveLoadTab) => void
  setSaveModalError: (v: string | null) => void
  setIsSavingSlot: (v: boolean) => void
  setLoadingSlotId: (v: string | null) => void
  setDeletingSlotId: (v: string | null) => void
  setReplaySlotId: (v: string | null) => void
  setIsExitingAfterSave: (v: boolean) => void

  setEndingSaved: (v: boolean) => void

  setThinkingVisible: (v: boolean) => void
  setThinkingText: (v: string) => void
  setThinkingTypewriter: (v: boolean) => void

  /** Reset all overlays to closed */
  resetOverlays: () => void
  /** Full reset */
  resetAll: () => void
}

const initialState: VnStageUIState = {
  showBacklog: false,
  showSystemMenu: false,
  showCommandModal: false,
  showSaveLoad: false,
  showExitConfirm: false,

  inputTab: 'talk',
  selectedActionId: null,
  talkText: '',

  saveLoadTab: 'load',
  saveModalError: null,
  isSavingSlot: false,
  loadingSlotId: null,
  deletingSlotId: null,
  replaySlotId: null,
  isExitingAfterSave: false,

  endingSaved: false,

  thinkingVisible: false,
  thinkingText: '',
  thinkingTypewriter: true,
}

export const useVnStageStore = create<VnStageUIState & VnStageUIActions>()(
  (set) => ({
    ...initialState,

    setShowBacklog: (v) => set({ showBacklog: v }),
    setShowSystemMenu: (v) => set({ showSystemMenu: v }),
    setShowCommandModal: (v) => set({ showCommandModal: v }),
    setShowSaveLoad: (v) => set({ showSaveLoad: v }),
    setShowExitConfirm: (v) => set({ showExitConfirm: v }),

    setInputTab: (v) => set({ inputTab: v }),
    setSelectedActionId: (v) => set({ selectedActionId: v }),
    setTalkText: (v) => set({ talkText: v }),

    setSaveLoadTab: (v) => set({ saveLoadTab: v }),
    setSaveModalError: (v) => set({ saveModalError: v }),
    setIsSavingSlot: (v) => set({ isSavingSlot: v }),
    setLoadingSlotId: (v) => set({ loadingSlotId: v }),
    setDeletingSlotId: (v) => set({ deletingSlotId: v }),
    setReplaySlotId: (v) => set({ replaySlotId: v }),
    setIsExitingAfterSave: (v) => set({ isExitingAfterSave: v }),

    setEndingSaved: (v) => set({ endingSaved: v }),

    setThinkingVisible: (v) => set({ thinkingVisible: v }),
    setThinkingText: (v) => set({ thinkingText: v }),
    setThinkingTypewriter: (v) => set({ thinkingTypewriter: v }),

    resetOverlays: () =>
      set({
        showBacklog: false,
        showSystemMenu: false,
        showCommandModal: false,
        showSaveLoad: false,
        showExitConfirm: false,
      }),

    resetAll: () => set(initialState),
  }),
)
