import { create } from 'zustand'
import { getStoredBool, getStoredNumber } from '@/lib/storage'

export interface SettingsState {
  /** Master volume (0-100) */
  masterVolume: number
  /** BGM volume (0-100) */
  bgmVolume: number
  /** SFX volume (0-100) */
  sfxVolume: number
  /** Text speed (1-10) */
  textSpeed: number
  /** Auto-advance enabled */
  autoAdvance: boolean
  /** Auto-advance delay in seconds (1-10) */
  autoAdvanceDelay: number
}

export interface SettingsActions {
  setMasterVolume: (val: number) => void
  setBgmVolume: (val: number) => void
  setSfxVolume: (val: number) => void
  setTextSpeed: (val: number) => void
  setAutoAdvance: (val: boolean) => void
  setAutoAdvanceDelay: (val: number) => void
  resetAll: () => void
}

const DEFAULTS: SettingsState = {
  masterVolume: 80,
  bgmVolume: 70,
  sfxVolume: 80,
  textSpeed: 5,
  autoAdvance: false,
  autoAdvanceDelay: 3,
}

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  (set) => ({
    // --- State ---
    masterVolume: getStoredNumber('settings_master_volume', DEFAULTS.masterVolume),
    bgmVolume: getStoredNumber('settings_bgm_volume', DEFAULTS.bgmVolume),
    sfxVolume: getStoredNumber('settings_sfx_volume', DEFAULTS.sfxVolume),
    textSpeed: getStoredNumber('settings_text_speed', DEFAULTS.textSpeed),
    autoAdvance: getStoredBool('settings_auto_advance', DEFAULTS.autoAdvance),
    autoAdvanceDelay: getStoredNumber('settings_auto_advance_delay', DEFAULTS.autoAdvanceDelay),

    // --- Actions ---
    setMasterVolume: (val) => {
      localStorage.setItem('settings_master_volume', String(val))
      set({ masterVolume: val })
    },
    setBgmVolume: (val) => {
      localStorage.setItem('settings_bgm_volume', String(val))
      set({ bgmVolume: val })
    },
    setSfxVolume: (val) => {
      localStorage.setItem('settings_sfx_volume', String(val))
      set({ sfxVolume: val })
    },
    setTextSpeed: (val) => {
      localStorage.setItem('settings_text_speed', String(val))
      set({ textSpeed: val })
    },
    setAutoAdvance: (val) => {
      localStorage.setItem('settings_auto_advance', String(val))
      set({ autoAdvance: val })
    },
    setAutoAdvanceDelay: (val) => {
      localStorage.setItem('settings_auto_advance_delay', String(val))
      set({ autoAdvanceDelay: val })
    },
    resetAll: () => {
      Object.keys(DEFAULTS).forEach((key) => {
        localStorage.removeItem(`settings_${key.replace(/([A-Z])/g, '_$1').toLowerCase()}`)
      })
      // Explicitly remove all keys
      localStorage.removeItem('settings_master_volume')
      localStorage.removeItem('settings_bgm_volume')
      localStorage.removeItem('settings_sfx_volume')
      localStorage.removeItem('settings_text_speed')
      localStorage.removeItem('settings_auto_advance')
      localStorage.removeItem('settings_auto_advance_delay')
      set({ ...DEFAULTS })
    },
  }),
)
