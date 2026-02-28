import { useSettingsStore } from '@/stores/useSettingsStore'

const getState = () => useSettingsStore.getState()

describe('useSettingsStore', () => {
  beforeEach(() => {
    // Reset store to defaults
    useSettingsStore.setState({
      masterVolume: 80,
      bgmVolume: 70,
      sfxVolume: 80,
      textSpeed: 5,
      autoAdvance: false,
      autoAdvanceDelay: 3,
    })
  })

  // ---------- Initial state ----------

  describe('initial state', () => {
    it('has correct default values', () => {
      const s = getState()
      expect(s.masterVolume).toBe(80)
      expect(s.bgmVolume).toBe(70)
      expect(s.sfxVolume).toBe(80)
      expect(s.textSpeed).toBe(5)
      expect(s.autoAdvance).toBe(false)
      expect(s.autoAdvanceDelay).toBe(3)
    })
  })

  // ---------- setMasterVolume ----------

  describe('setMasterVolume', () => {
    it('updates state and persists to localStorage', () => {
      getState().setMasterVolume(50)
      expect(getState().masterVolume).toBe(50)
      expect(localStorage.getItem('settings_master_volume')).toBe('50')
    })
  })

  // ---------- setBgmVolume ----------

  describe('setBgmVolume', () => {
    it('updates state and persists to localStorage', () => {
      getState().setBgmVolume(30)
      expect(getState().bgmVolume).toBe(30)
      expect(localStorage.getItem('settings_bgm_volume')).toBe('30')
    })
  })

  // ---------- setSfxVolume ----------

  describe('setSfxVolume', () => {
    it('updates state and persists to localStorage', () => {
      getState().setSfxVolume(100)
      expect(getState().sfxVolume).toBe(100)
      expect(localStorage.getItem('settings_sfx_volume')).toBe('100')
    })
  })

  // ---------- setTextSpeed ----------

  describe('setTextSpeed', () => {
    it('updates state and persists to localStorage', () => {
      getState().setTextSpeed(10)
      expect(getState().textSpeed).toBe(10)
      expect(localStorage.getItem('settings_text_speed')).toBe('10')
    })
  })

  // ---------- setAutoAdvance ----------

  describe('setAutoAdvance', () => {
    it('updates state and persists to localStorage', () => {
      getState().setAutoAdvance(true)
      expect(getState().autoAdvance).toBe(true)
      expect(localStorage.getItem('settings_auto_advance')).toBe('true')
    })
  })

  // ---------- setAutoAdvanceDelay ----------

  describe('setAutoAdvanceDelay', () => {
    it('updates state and persists to localStorage', () => {
      getState().setAutoAdvanceDelay(7)
      expect(getState().autoAdvanceDelay).toBe(7)
      expect(localStorage.getItem('settings_auto_advance_delay')).toBe('7')
    })
  })

  // ---------- resetAll ----------

  describe('resetAll', () => {
    it('restores default values and clears localStorage keys', () => {
      // Set non-default values
      getState().setMasterVolume(10)
      getState().setBgmVolume(20)
      getState().setSfxVolume(30)
      getState().setTextSpeed(1)
      getState().setAutoAdvance(true)
      getState().setAutoAdvanceDelay(9)

      // Verify they changed
      expect(getState().masterVolume).toBe(10)
      expect(localStorage.getItem('settings_master_volume')).toBe('10')

      // Reset
      getState().resetAll()

      // Verify defaults restored
      const s = getState()
      expect(s.masterVolume).toBe(80)
      expect(s.bgmVolume).toBe(70)
      expect(s.sfxVolume).toBe(80)
      expect(s.textSpeed).toBe(5)
      expect(s.autoAdvance).toBe(false)
      expect(s.autoAdvanceDelay).toBe(3)

      // Verify localStorage cleared
      expect(localStorage.getItem('settings_master_volume')).toBeNull()
      expect(localStorage.getItem('settings_bgm_volume')).toBeNull()
      expect(localStorage.getItem('settings_sfx_volume')).toBeNull()
      expect(localStorage.getItem('settings_text_speed')).toBeNull()
      expect(localStorage.getItem('settings_auto_advance')).toBeNull()
      expect(localStorage.getItem('settings_auto_advance_delay')).toBeNull()
    })
  })
})
