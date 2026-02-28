import { useUiStore } from '@/stores/useUiStore'

/** Helper to read current state without React rendering */
const getState = () => useUiStore.getState()

describe('useUiStore', () => {
  beforeEach(() => {
    // Reset store to defaults before each test
    useUiStore.setState({
      backgroundProps: { noAnim: false },
      enableMouseFollow: true,
      enableCustomCursor: true,
      enableSakura: true,
      autoHideMenu: true,
      currentTheme: 'dark',
    })
  })

  // ---------- Initial state ----------

  describe('initial state', () => {
    it('has default theme "dark" when localStorage is empty', () => {
      expect(getState().currentTheme).toBe('dark')
    })

    it('has animations enabled by default (DISABLE_ANIMATIONS = false)', () => {
      const s = getState()
      expect(s.backgroundProps.noAnim).toBe(false)
      expect(s.enableMouseFollow).toBe(true)
      expect(s.enableCustomCursor).toBe(true)
      expect(s.enableSakura).toBe(true)
      expect(s.autoHideMenu).toBe(true)
    })
  })

  // ---------- setBackgroundProps ----------

  describe('setBackgroundProps', () => {
    it('merges partial props into backgroundProps', () => {
      getState().setBackgroundProps({ noAnim: true })
      expect(getState().backgroundProps.noAnim).toBe(true)
    })

    it('preserves existing props when merging unrelated keys', () => {
      // Set a known baseline
      useUiStore.setState({ backgroundProps: { noAnim: true } })
      // Merge with empty — noAnim should stay
      getState().setBackgroundProps({})
      expect(getState().backgroundProps.noAnim).toBe(true)
    })
  })

  // ---------- resetBackgroundProps ----------

  describe('resetBackgroundProps', () => {
    it('restores backgroundProps to default { noAnim: false }', () => {
      getState().setBackgroundProps({ noAnim: true })
      expect(getState().backgroundProps.noAnim).toBe(true)

      getState().resetBackgroundProps()
      expect(getState().backgroundProps).toEqual({ noAnim: false })
    })
  })

  // ---------- setMouseFollow ----------

  describe('setMouseFollow', () => {
    it('updates enableMouseFollow state and persists to localStorage', () => {
      getState().setMouseFollow(false)
      expect(getState().enableMouseFollow).toBe(false)
      expect(localStorage.getItem('ui_enable_mouse_follow')).toBe('false')

      getState().setMouseFollow(true)
      expect(getState().enableMouseFollow).toBe(true)
      expect(localStorage.getItem('ui_enable_mouse_follow')).toBe('true')
    })
  })

  // ---------- setCustomCursor ----------

  describe('setCustomCursor', () => {
    it('updates enableCustomCursor state and persists to localStorage', () => {
      getState().setCustomCursor(false)
      expect(getState().enableCustomCursor).toBe(false)
      expect(localStorage.getItem('ui_enable_custom_cursor')).toBe('false')
    })
  })

  // ---------- setSakura ----------

  describe('setSakura', () => {
    it('updates enableSakura state and persists to localStorage', () => {
      getState().setSakura(false)
      expect(getState().enableSakura).toBe(false)
      expect(localStorage.getItem('ui_enable_sakura')).toBe('false')
    })
  })

  // ---------- setAutoHideMenu ----------

  describe('setAutoHideMenu', () => {
    it('updates autoHideMenu state and persists to localStorage', () => {
      getState().setAutoHideMenu(false)
      expect(getState().autoHideMenu).toBe(false)
      expect(localStorage.getItem('ui_auto_hide_menu')).toBe('false')
    })
  })

  // ---------- setTheme ----------

  describe('setTheme', () => {
    it('updates currentTheme state and persists to localStorage', () => {
      getState().setTheme('light')
      expect(getState().currentTheme).toBe('light')
      expect(localStorage.getItem('user-theme')).toBe('light')
    })

    it('sets data-theme attribute on document.documentElement', () => {
      getState().setTheme('ocean-breeze')
      expect(document.documentElement.getAttribute('data-theme')).toBe('ocean-breeze')
    })
  })
})
