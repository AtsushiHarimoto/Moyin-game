import { create } from 'zustand'
import { getStoredBool } from '@/lib/storage'
import { DISABLE_ANIMATIONS } from '@/config/env'

export interface UiState {
  /** Background properties (noAnim: disable animations) */
  backgroundProps: { noAnim: boolean }
  /** Mouse follow particle effect */
  enableMouseFollow: boolean
  /** Custom cursor (theme-specific) */
  enableCustomCursor: boolean
  /** Sakura falling effect */
  enableSakura: boolean
  /** Auto-hide bottom menu */
  autoHideMenu: boolean
  /** Current theme name */
  currentTheme: string
}

export interface UiActions {
  setBackgroundProps: (props: Partial<UiState['backgroundProps']>) => void
  resetBackgroundProps: () => void
  setMouseFollow: (val: boolean) => void
  setCustomCursor: (val: boolean) => void
  setSakura: (val: boolean) => void
  setAutoHideMenu: (val: boolean) => void
  setTheme: (val: string) => void
}

export const useUiStore = create<UiState & UiActions>()((set) => {
  const defaultOn = !DISABLE_ANIMATIONS
  const storedTheme = localStorage.getItem('user-theme') || 'dark'
  const normalizedTheme = storedTheme.replace(/_/g, '-')

  /** Persist a boolean flag to localStorage and update store state. */
  function persistBool<K extends keyof UiState>(key: string, field: K, val: boolean): void {
    localStorage.setItem(key, String(val))
    set({ [field]: val } as Partial<UiState>)
  }

  return {
    // --- State ---
    backgroundProps: { noAnim: DISABLE_ANIMATIONS },
    enableMouseFollow: getStoredBool('ui_enable_mouse_follow', defaultOn),
    enableCustomCursor: getStoredBool('ui_enable_custom_cursor', defaultOn),
    enableSakura: getStoredBool('ui_enable_sakura', defaultOn),
    autoHideMenu: getStoredBool('ui_auto_hide_menu', defaultOn),
    currentTheme: normalizedTheme,

    // --- Actions ---
    setBackgroundProps: (props) =>
      set((state) => ({
        backgroundProps: { ...state.backgroundProps, ...props },
      })),

    resetBackgroundProps: () =>
      set({ backgroundProps: { noAnim: DISABLE_ANIMATIONS } }),

    setMouseFollow: (val) => persistBool('ui_enable_mouse_follow', 'enableMouseFollow', val),
    setCustomCursor: (val) => persistBool('ui_enable_custom_cursor', 'enableCustomCursor', val),
    setSakura: (val) => persistBool('ui_enable_sakura', 'enableSakura', val),
    setAutoHideMenu: (val) => persistBool('ui_auto_hide_menu', 'autoHideMenu', val),

    setTheme: (val) => {
      localStorage.setItem('user-theme', val)
      document.documentElement.setAttribute('data-theme', val)
      set({ currentTheme: val })
    },
  }
})
