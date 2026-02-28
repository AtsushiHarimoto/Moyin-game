import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { renderWithProviders } from '../helpers/renderWithProviders'
import SettingsPage from '@/routes/settings/page'
import { useUiStore } from '@/stores/useUiStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import i18n from '@/lib/i18n'

// Mock framer-motion so AnimatePresence mode="wait" doesn't block tab content
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion')
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  }
})

// en.json translated labels (different from code fallback defaults)
const LABEL_THEME = 'Appearance'       // setting_lbl_theme
const TAB_GAME = 'Effects'             // setting_game
const LABEL_SAKURA = 'Sakura Falling Effect' // setting_lbl_enable_sakura in en.json
const LABEL_CURSOR = 'Custom Cursor'   // setting_lbl_custom_cursor

describe('SettingsPage', () => {
  beforeEach(() => {
    useUiStore.setState({
      backgroundProps: { noAnim: false },
      enableMouseFollow: true,
      enableCustomCursor: true,
      enableSakura: true,
      autoHideMenu: true,
      currentTheme: 'dark',
    })
    useSettingsStore.setState({
      masterVolume: 80,
      bgmVolume: 70,
      sfxVolume: 80,
      textSpeed: 5,
      autoAdvance: false,
      autoAdvanceDelay: 3,
    })
    i18n.changeLanguage('en')
  })

  // ---------- Display tab (default) ----------

  it('renders Display tab by default with Theme and Language selects', () => {
    renderWithProviders(<SettingsPage />)

    expect(screen.getByText(LABEL_THEME)).toBeInTheDocument()
    expect(screen.getByText('Language')).toBeInTheDocument()
  })

  // ---------- Game tab ----------

  it('shows Sakura and Custom Cursor toggles on Game tab', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SettingsPage />)

    await user.click(screen.getByText(TAB_GAME))

    expect(screen.getByText(LABEL_SAKURA)).toBeInTheDocument()
    expect(screen.getByText(LABEL_CURSOR)).toBeInTheDocument()
  })

  // ---------- Sakura toggle ----------

  it('toggles Sakura effect and updates store + localStorage', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SettingsPage />)

    await user.click(screen.getByText(TAB_GAME))

    const sakuraToggle = screen.getByText(LABEL_SAKURA)
      .closest('div[class*="justify-between"]')!
      .querySelector('button[role="switch"]')! as HTMLElement
    expect(sakuraToggle.getAttribute('aria-checked')).toBe('true')

    await user.click(sakuraToggle)
    expect(useUiStore.getState().enableSakura).toBe(false)
    expect(localStorage.getItem('ui_enable_sakura')).toBe('false')
  })

  // ---------- Custom Cursor toggle ----------

  it('toggles Custom Cursor and updates store', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SettingsPage />)

    await user.click(screen.getByText(TAB_GAME))

    const cursorToggle = screen.getByText(LABEL_CURSOR)
      .closest('div[class*="justify-between"]')!
      .querySelector('button[role="switch"]')! as HTMLElement
    expect(cursorToggle.getAttribute('aria-checked')).toBe('true')

    await user.click(cursorToggle)
    expect(useUiStore.getState().enableCustomCursor).toBe(false)
  })

  // ---------- Audio tab ----------

  it('shows volume sliders on Audio tab', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SettingsPage />)

    await user.click(screen.getByText('Audio'))

    expect(screen.getByText('Master Volume')).toBeInTheDocument()
    expect(screen.getByText('BGM Volume')).toBeInTheDocument()
    expect(screen.getByText('SFX Volume')).toBeInTheDocument()
  })

  // ---------- System tab ----------

  it('shows Clear Data and Export buttons on System tab', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SettingsPage />)

    await user.click(screen.getByText('System'))

    expect(screen.getByText('Clear Data')).toBeInTheDocument()
    expect(screen.getByText('Export')).toBeInTheDocument()
  })

  // ---------- Theme select ----------

  it('updates theme in store when changing Theme select', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SettingsPage />)

    const themeRow = screen.getByText(LABEL_THEME).closest('div[class*="justify-between"]')!
    const select = within(themeRow as HTMLElement).getByRole('combobox')

    await user.selectOptions(select, 'sakura')
    expect(useUiStore.getState().currentTheme).toBe('sakura')
  })

  // ---------- Language select ----------

  it('updates i18n language when changing Language select', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SettingsPage />)

    const langRow = screen.getByText('Language').closest('div[class*="justify-between"]')!
    const select = within(langRow as HTMLElement).getByRole('combobox')

    await user.selectOptions(select, 'ja')
    expect(i18n.language).toBe('ja')
    expect(localStorage.getItem('user-locale')).toBe('ja')
  })
})
