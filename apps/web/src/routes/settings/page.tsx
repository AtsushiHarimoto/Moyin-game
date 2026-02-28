import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { useUiStore } from '@/stores/useUiStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { cn } from '@/lib/cn'
import {
  SlidersHorizontal,
  Volume2,
  Gamepad2,
  Settings2,
  Flower2,
  MousePointerClick,
  Mouse,
  Trash2,
  Download,
  Info,
  Globe,
  Palette,
  Music,
  Volume1,
  Type,
  Timer,
  ToggleLeft,
  Code2,
} from 'lucide-react'

/**
 * SettingsPage - Application settings with sidebar navigation.
 * Sections: Display, Audio, Game, System
 * All settings persist to localStorage via zustand stores.
 */

interface SettingTab {
  key: string
  label: string
  icon: React.ReactNode
}

// ---- Animation ----
const panelVariants = {
  hidden: { opacity: 0, x: 12 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, x: -12, transition: { duration: 0.15 } },
}

export default function SettingsPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const uiStore = useUiStore()
  const settingsStore = useSettingsStore()

  const [activeTab, setActiveTab] = useState('display')

  const settingTabs = useMemo<SettingTab[]>(
    () => [
      {
        key: 'display',
        label: t('message.setting_display', 'Display'),
        icon: <SlidersHorizontal size={22} />,
      },
      {
        key: 'audio',
        label: t('message.setting_audio', 'Audio'),
        icon: <Volume2 size={22} />,
      },
      {
        key: 'game',
        label: t('message.setting_game', 'Game'),
        icon: <Gamepad2 size={22} />,
      },
      {
        key: 'system',
        label: t('message.setting_system', 'System'),
        icon: <Settings2 size={22} />,
      },
    ],
    [t],
  )

  const themeOptions = useMemo(
    () => [
      { value: 'sakura', label: t('message.setting_theme_sakura', 'Sakura') },
      { value: 'dark', label: t('message.setting_theme_dark', 'Dark') },
      {
        value: 'tokyo-night',
        label: t('message.setting_theme_tokyo_night', 'Tokyo Night'),
      },
      { value: 'hack', label: t('message.setting_theme_hack', 'Hacker') },
      {
        value: 'eye-care',
        label: t('message.setting_theme_eye_care', 'Eye Care'),
      },
    ],
    [t],
  )

  const localeOptions = [
    { value: 'en', label: 'English' },
    { value: 'ja', label: '\u65E5\u672C\u8A9E' },
    { value: 'zh-CN', label: '\u7B80\u4F53\u4E2D\u6587' },
    { value: 'zh-TW', label: '\u7E41\u9AD4\u4E2D\u6587' },
    { value: 'zh-HK', label: '\u7CB5\u8A9E' },
  ]

  const handleSetLocale = useCallback(
    (val: string) => {
      i18n.changeLanguage(val)
      localStorage.setItem('user-locale', val)
    },
    [i18n],
  )

  const handleSetTheme = useCallback(
    (val: string) => {
      uiStore.setTheme(val)
    },
    [uiStore],
  )

  const handleClearData = useCallback(async () => {
    const confirmed = window.confirm(
      t(
        'message.dialog_clear_data_msg',
        'This will permanently delete all local data. Are you sure?',
      ),
    )
    if (confirmed) {
      localStorage.clear()
      // Clear IndexedDB
      try {
        const dbs = await window.indexedDB.databases()
        for (const db of dbs) {
          if (db.name) window.indexedDB.deleteDatabase(db.name)
        }
      } catch {
        // indexedDB.databases() not supported in all browsers
      }
      window.location.reload()
    }
  }, [t])

  const handleExportData = useCallback(async () => {
    try {
      const data: Record<string, string | null> = {}
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key) data[key] = localStorage.getItem(key)
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `moyin-settings-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('[SettingsPage] Export failed:', err)
    }
  }, [])

  return (
    <div className="flex h-full w-full flex-col">
      <div className="mx-auto flex min-h-0 w-full max-w-[var(--ui-container-width)] flex-1 gap-6 p-8 max-md:flex-col max-md:p-4">
        {/* Left Sidebar */}
        <aside className="flex w-[240px] min-w-[240px] flex-shrink-0 flex-col max-md:w-full max-md:min-w-0">
          <nav
            className="flex h-full flex-col gap-2 overflow-y-auto rounded-xl border p-4 max-md:flex-row max-md:overflow-x-auto"
            style={{
              background: 'var(--ui-panel-glass)',
              borderColor: 'var(--ui-panel-glass-border)',
              boxShadow: 'var(--ui-shadow-soft)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <div
              className="mb-1 px-4 py-3 text-xs font-bold uppercase tracking-[0.1em] max-md:hidden"
              style={{ color: 'var(--ui-muted)' }}
            >
              {t('message.setting_menu', 'Settings')}
            </div>

            {settingTabs.map((tab) => (
              <button
                key={tab.key}
                className={cn(
                  'flex items-center gap-3 rounded-lg border-l-2 border-transparent px-4 py-3 text-left text-sm font-medium transition-all max-md:border-l-0 max-md:border-b-2 max-md:px-3 max-md:py-2 max-md:text-xs',
                  activeTab === tab.key ? 'font-semibold' : 'bg-transparent',
                )}
                style={{
                  background:
                    activeTab === tab.key
                      ? 'var(--ui-primary-soft)'
                      : 'transparent',
                  borderLeftColor:
                    activeTab === tab.key ? 'var(--ui-primary)' : 'transparent',
                  borderBottomColor:
                    activeTab === tab.key ? 'var(--ui-primary)' : 'transparent',
                  color:
                    activeTab === tab.key
                      ? 'var(--ui-text)'
                      : 'var(--ui-muted)',
                }}
                onClick={() => setActiveTab(tab.key)}
              >
                <span
                  style={{
                    color:
                      activeTab === tab.key ? 'var(--ui-primary)' : undefined,
                  }}
                >
                  {tab.icon}
                </span>
                <span className="flex-1 tracking-wide">{tab.label}</span>
              </button>
            ))}

            <div className="mt-auto px-4 pt-4 max-md:hidden">
              <div
                className="mb-4 h-px"
                style={{
                  background:
                    'linear-gradient(to right, transparent, var(--ui-border), transparent)',
                }}
              />
              <p
                className="m-0 text-center text-xs"
                style={{ color: 'var(--ui-muted)' }}
              >
                Version 2.0.0
              </p>
            </div>
          </nav>
        </aside>

        {/* Right Content */}
        <section className="flex min-w-0 flex-1 flex-col">
          <div
            className="flex-1 overflow-y-auto rounded-xl border p-8 max-md:p-5"
            style={{
              background: 'var(--ui-panel-glass)',
              borderColor: 'var(--ui-panel-glass-border)',
              boxShadow: 'var(--ui-shadow-soft)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <AnimatePresence mode="wait">
              {/* ===== Display Settings ===== */}
              {activeTab === 'display' && (
                <motion.div
                  key="display"
                  variants={panelVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <SectionHeader
                    title={t('message.setting_display', 'Display')}
                  />
                  <p
                    className="mb-6 ml-5 text-sm"
                    style={{ color: 'var(--ui-muted)' }}
                  >
                    {t(
                      'message.setting_desc_display',
                      'Appearance and language settings',
                    )}
                  </p>

                  <div className="flex flex-col gap-4 pl-2">
                    {/* Theme */}
                    <SettingsRow
                      icon={<Palette size={20} />}
                      iconColor="text-pink-400"
                      label={t('message.setting_lbl_theme', 'Theme')}
                      description={t(
                        'message.setting_desc_theme',
                        'Choose a visual theme for the application',
                      )}
                    >
                      <StyledSelect
                        value={uiStore.currentTheme}
                        options={themeOptions}
                        onChange={handleSetTheme}
                      />
                    </SettingsRow>

                    {/* Language */}
                    <SettingsRow
                      icon={<Globe size={20} />}
                      iconColor="text-blue-400"
                      label={t('message.setting_lbl_language', 'Language')}
                      description={t(
                        'message.setting_desc_language',
                        'Select display language',
                      )}
                    >
                      <StyledSelect
                        value={i18n.language}
                        options={localeOptions}
                        onChange={handleSetLocale}
                      />
                    </SettingsRow>

                  </div>
                </motion.div>
              )}

              {/* ===== Audio Settings ===== */}
              {activeTab === 'audio' && (
                <motion.div
                  key="audio"
                  variants={panelVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <SectionHeader
                    title={t('message.setting_audio', 'Audio')}
                  />
                  <p
                    className="mb-6 ml-5 text-sm"
                    style={{ color: 'var(--ui-muted)' }}
                  >
                    {t(
                      'message.setting_desc_audio',
                      'Adjust volume levels for music and sound effects',
                    )}
                  </p>

                  <div className="flex flex-col gap-5 pl-2">
                    <SliderRow
                      icon={<Volume2 size={20} />}
                      iconColor="text-emerald-400"
                      label={t(
                        'message.setting_lbl_master_volume',
                        'Master Volume',
                      )}
                      description={t(
                        'message.setting_desc_master_volume',
                        'Controls overall volume level',
                      )}
                      value={settingsStore.masterVolume}
                      min={0}
                      max={100}
                      step={1}
                      onChange={settingsStore.setMasterVolume}
                      formatValue={(v) => `${v}%`}
                    />
                    <SliderRow
                      icon={<Music size={20} />}
                      iconColor="text-amber-400"
                      label={t(
                        'message.setting_lbl_bgm_volume',
                        'BGM Volume',
                      )}
                      description={t(
                        'message.setting_desc_bgm_volume',
                        'Background music volume',
                      )}
                      value={settingsStore.bgmVolume}
                      min={0}
                      max={100}
                      step={1}
                      onChange={settingsStore.setBgmVolume}
                      formatValue={(v) => `${v}%`}
                    />
                    <SliderRow
                      icon={<Volume1 size={20} />}
                      iconColor="text-sky-400"
                      label={t(
                        'message.setting_lbl_sfx_volume',
                        'SFX Volume',
                      )}
                      description={t(
                        'message.setting_desc_sfx_volume',
                        'Sound effects volume',
                      )}
                      value={settingsStore.sfxVolume}
                      min={0}
                      max={100}
                      step={1}
                      onChange={settingsStore.setSfxVolume}
                      formatValue={(v) => `${v}%`}
                    />
                  </div>
                </motion.div>
              )}

              {/* ===== Game Settings ===== */}
              {activeTab === 'game' && (
                <motion.div
                  key="game"
                  variants={panelVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <SectionHeader
                    title={t('message.setting_game', 'Game')}
                  />
                  <p
                    className="mb-6 ml-5 text-sm"
                    style={{ color: 'var(--ui-muted)' }}
                  >
                    {t(
                      'message.setting_desc_game',
                      'Gameplay behavior and text display options',
                    )}
                  </p>

                  <div className="flex flex-col gap-5 pl-2">
                    <SliderRow
                      icon={<Type size={20} />}
                      iconColor="text-indigo-400"
                      label={t(
                        'message.setting_lbl_text_speed',
                        'Text Speed',
                      )}
                      description={t(
                        'message.setting_desc_text_speed',
                        'Speed of text reveal animation (1 = slow, 10 = instant)',
                      )}
                      value={settingsStore.textSpeed}
                      min={1}
                      max={10}
                      step={1}
                      onChange={settingsStore.setTextSpeed}
                    />

                    <ToggleRow
                      icon={<ToggleLeft size={20} />}
                      iconColor="text-teal-400"
                      label={t(
                        'message.setting_lbl_auto_advance',
                        'Auto-Advance',
                      )}
                      description={t(
                        'message.setting_desc_auto_advance',
                        'Automatically advance to the next dialogue after a delay',
                      )}
                      checked={settingsStore.autoAdvance}
                      onChange={settingsStore.setAutoAdvance}
                    />

                    {settingsStore.autoAdvance && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <SliderRow
                          icon={<Timer size={20} />}
                          iconColor="text-orange-400"
                          label={t(
                            'message.setting_lbl_auto_delay',
                            'Auto-Advance Delay',
                          )}
                          description={t(
                            'message.setting_desc_auto_delay',
                            'Seconds to wait before auto-advancing',
                          )}
                          value={settingsStore.autoAdvanceDelay}
                          min={1}
                          max={10}
                          step={0.5}
                          onChange={settingsStore.setAutoAdvanceDelay}
                          formatValue={(v) => `${v}s`}
                        />
                      </motion.div>
                    )}

                    {/* Visual Effects */}
                    <ToggleRow
                      icon={<Flower2 size={20} />}
                      iconColor="text-pink-400"
                      label={t('message.setting_lbl_enable_sakura', 'Sakura Effect')}
                      description={t(
                        'message.setting_desc_enable_sakura',
                        'Enable falling sakura petal animation',
                      )}
                      checked={uiStore.enableSakura}
                      onChange={uiStore.setSakura}
                    />

                    <ToggleRow
                      icon={<MousePointerClick size={20} />}
                      iconColor="text-blue-400"
                      label={t('message.setting_lbl_mouse_follow', 'Mouse Halo')}
                      description={t(
                        'message.setting_desc_mouse_follow',
                        'Enable mouse trail particles',
                      )}
                      checked={uiStore.enableMouseFollow}
                      onChange={uiStore.setMouseFollow}
                    />

                    <ToggleRow
                      icon={<Mouse size={20} />}
                      iconColor="text-violet-400"
                      label={t('message.setting_lbl_custom_cursor', 'Custom Cursor')}
                      description={t(
                        'message.setting_desc_custom_cursor',
                        'Use themed custom cursor',
                      )}
                      checked={uiStore.enableCustomCursor}
                      onChange={uiStore.setCustomCursor}
                    />
                  </div>
                </motion.div>
              )}

              {/* ===== System Settings ===== */}
              {activeTab === 'system' && (
                <motion.div
                  key="system"
                  variants={panelVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <SectionHeader
                    title={t('message.setting_system', 'System')}
                  />
                  <p
                    className="mb-6 ml-5 text-sm"
                    style={{ color: 'var(--ui-muted)' }}
                  >
                    {t(
                      'message.setting_desc_system',
                      'Data management and application information',
                    )}
                  </p>

                  <div className="flex flex-col gap-4 pl-2">
                    {/* Clear Data */}
                    <div
                      className="flex items-center justify-between rounded-lg border p-5 transition-all"
                      style={{
                        background:
                          'color-mix(in srgb, var(--ui-danger) 5%, var(--ui-panel))',
                        borderColor:
                          'color-mix(in srgb, var(--ui-danger) 10%, transparent)',
                      }}
                    >
                      <div className="flex flex-1 items-center gap-4">
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-md"
                          style={{
                            background:
                              'color-mix(in srgb, var(--ui-danger) 10%, transparent)',
                            color: 'var(--ui-danger)',
                          }}
                        >
                          <Trash2 size={22} />
                        </div>
                        <div className="flex-1">
                          <h3
                            className="m-0 mb-1 text-sm font-medium"
                            style={{ color: 'var(--ui-text)' }}
                          >
                            {t(
                              'message.setting_lbl_clear_data',
                              'Clear All Data',
                            )}
                          </h3>
                          <p
                            className="m-0 text-xs"
                            style={{ color: 'var(--ui-muted)' }}
                          >
                            {t(
                              'message.setting_desc_clear_data',
                              'Permanently delete all local data including saves and settings',
                            )}
                          </p>
                        </div>
                      </div>
                      <button
                        className="flex-shrink-0 rounded-lg border px-4 py-2 text-sm font-semibold transition-all hover:opacity-90"
                        style={{
                          background: 'var(--ui-danger)',
                          borderColor: 'var(--ui-danger)',
                          color: '#fff',
                        }}
                        onClick={handleClearData}
                      >
                        {t('message.setting_btn_clear_data', 'Clear Data')}
                      </button>
                    </div>

                    {/* Export Data */}
                    <div
                      className="flex items-center justify-between rounded-lg border p-5 transition-all"
                      style={{
                        background: 'var(--ui-panel-subtle)',
                        borderColor: 'var(--ui-border)',
                      }}
                    >
                      <div className="flex flex-1 items-center gap-4">
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-md border"
                          style={{
                            background: 'var(--ui-panel)',
                            borderColor: 'var(--ui-border)',
                            color: 'var(--ui-primary)',
                          }}
                        >
                          <Download size={22} />
                        </div>
                        <div className="flex-1">
                          <h3
                            className="m-0 mb-1 text-sm font-medium"
                            style={{ color: 'var(--ui-text)' }}
                          >
                            {t(
                              'message.setting_lbl_export_data',
                              'Export Data',
                            )}
                          </h3>
                          <p
                            className="m-0 text-xs"
                            style={{ color: 'var(--ui-muted)' }}
                          >
                            {t(
                              'message.setting_desc_export_data',
                              'Download your settings as a JSON file',
                            )}
                          </p>
                        </div>
                      </div>
                      <button
                        className="flex-shrink-0 rounded-lg border px-4 py-2 text-sm font-semibold transition-all hover:opacity-90"
                        style={{
                          background:
                            'color-mix(in srgb, var(--ui-primary) 15%, transparent)',
                          borderColor:
                            'color-mix(in srgb, var(--ui-primary) 30%, transparent)',
                          color: 'var(--ui-primary)',
                        }}
                        onClick={handleExportData}
                      >
                        {t('message.setting_btn_export', 'Export')}
                      </button>
                    </div>

                    {/* Story Editor */}
                    <div
                      className="flex items-center justify-between rounded-lg border p-5 transition-all"
                      style={{
                        background: 'var(--ui-panel-subtle)',
                        borderColor: 'var(--ui-border)',
                      }}
                    >
                      <div className="flex flex-1 items-center gap-4">
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-md border"
                          style={{
                            background: 'color-mix(in srgb, var(--ui-primary) 10%, transparent)',
                            borderColor: 'color-mix(in srgb, var(--ui-primary) 30%, transparent)',
                            color: 'var(--ui-primary)',
                          }}
                        >
                          <Code2 size={22} />
                        </div>
                        <div className="flex-1">
                          <h3
                            className="m-0 mb-1 text-sm font-medium"
                            style={{ color: 'var(--ui-text)' }}
                          >
                            {t('message.setting_lbl_story_editor', 'Story Editor')}
                          </h3>
                          <p
                            className="m-0 text-xs"
                            style={{ color: 'var(--ui-muted)' }}
                          >
                            {t('message.setting_desc_story_editor', 'Open the story pack editor to view and modify imported stories')}
                          </p>
                        </div>
                      </div>
                      <button
                        className="flex-shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition-all hover:opacity-90 hover:shadow-md"
                        style={{
                          background: 'var(--ui-gradient-primary)',
                          color: 'var(--ui-inverse)',
                        }}
                        onClick={() => {
                          navigate('/?workshop=1')
                        }}
                      >
                        {t('message.setting_btn_open_editor', 'Open Editor')}
                      </button>
                    </div>

                    {/* About Section */}
                    <div
                      className="mt-2 rounded-lg border p-6"
                      style={{
                        background: 'var(--ui-panel-subtle)',
                        borderColor: 'var(--ui-border)',
                      }}
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-md border"
                          style={{
                            background: 'var(--ui-panel)',
                            borderColor: 'var(--ui-border)',
                            color: 'var(--ui-primary)',
                          }}
                        >
                          <Info size={22} />
                        </div>
                        <div>
                          <h3
                            className="m-0 text-sm font-medium"
                            style={{ color: 'var(--ui-text)' }}
                          >
                            {t('message.setting_about', 'About')}
                          </h3>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 pl-1">
                        <AboutRow
                          label={t('message.setting_app_name', 'Application')}
                          value="Moyin Visual Novel Engine"
                        />
                        <AboutRow
                          label={t('message.setting_version', 'Version')}
                          value="2.0.0"
                        />
                        <AboutRow
                          label={t('message.setting_framework', 'Framework')}
                          value="React + TypeScript + Vite"
                        />
                        <AboutRow
                          label={t('message.setting_engine', 'Engine')}
                          value="@moyin/vn-engine"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </div>
    </div>
  )
}

// ---- Sub-components ----

function SectionHeader({
  title,
  danger,
}: {
  title: string
  danger?: boolean
}) {
  return (
    <div className="mb-1 flex items-center gap-3">
      <span
        className="h-6 w-1.5 rounded-full"
        style={{
          background: danger ? 'var(--ui-danger)' : 'var(--ui-primary)',
          boxShadow: `0 0 10px ${danger ? 'var(--ui-danger)' : 'var(--ui-primary)'}`,
        }}
      />
      <h2
        className="text-2xl font-bold"
        style={{
          color: 'var(--ui-text)',
          fontFamily: 'var(--ui-font-special)',
        }}
      >
        {title}
      </h2>
    </div>
  )
}

function SettingsRow({
  icon,
  iconColor,
  label,
  description,
  children,
}: {
  icon: React.ReactNode
  iconColor: string
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div
      className="flex items-center justify-between gap-4 rounded-lg border p-5 transition-all max-sm:flex-col max-sm:items-stretch"
      style={{
        background: 'var(--ui-panel-subtle)',
        borderColor: 'var(--ui-border)',
      }}
    >
      <div className="flex flex-1 items-center gap-4">
        <div
          className={cn(
            'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md border',
            iconColor,
          )}
          style={{
            background: 'var(--ui-panel)',
            borderColor: 'var(--ui-border)',
          }}
        >
          {icon}
        </div>
        <div className="flex-1">
          <h3
            className="m-0 mb-1 text-sm font-medium"
            style={{ color: 'var(--ui-text)' }}
          >
            {label}
          </h3>
          {description && (
            <p
              className="m-0 text-xs"
              style={{ color: 'var(--ui-muted)' }}
            >
              {description}
            </p>
          )}
        </div>
      </div>
      <div className="w-48 flex-shrink-0 max-sm:w-full">{children}</div>
    </div>
  )
}

function ToggleRow({
  icon,
  iconColor,
  label,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode
  iconColor: string
  label: string
  description: string
  checked: boolean
  onChange: (val: boolean) => void
}) {
  return (
    <div
      className="flex items-center justify-between rounded-lg border p-5 transition-all"
      style={{
        background: 'var(--ui-panel-subtle)',
        borderColor: 'var(--ui-border)',
      }}
    >
      <div className="flex flex-1 items-center gap-4">
        <div
          className={cn(
            'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md border',
            iconColor,
          )}
          style={{
            background: 'var(--ui-panel)',
            borderColor: 'var(--ui-border)',
          }}
        >
          {icon}
        </div>
        <div className="flex-1">
          <h3
            className="m-0 mb-1 text-sm font-medium"
            style={{ color: 'var(--ui-text)' }}
          >
            {label}
          </h3>
          <p
            className="m-0 text-xs"
            style={{ color: 'var(--ui-muted)' }}
          >
            {description}
          </p>
        </div>
      </div>

      {/* Toggle Switch */}
      <button
        role="switch"
        aria-checked={checked}
        className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors"
        style={{
          background: checked ? 'var(--ui-primary)' : 'var(--ui-border)',
        }}
        onClick={() => onChange(!checked)}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0',
          )}
        />
      </button>
    </div>
  )
}

function SliderRow({
  icon,
  iconColor,
  label,
  description,
  value,
  min,
  max,
  step,
  onChange,
  formatValue,
}: {
  icon: React.ReactNode
  iconColor: string
  label: string
  description?: string
  value: number
  min: number
  max: number
  step: number
  onChange: (val: number) => void
  formatValue?: (val: number) => string
}) {
  const ratio = ((value - min) / (max - min)) * 100
  const displayValue = formatValue ? formatValue(value) : String(value)

  return (
    <div
      className="rounded-lg border p-5 transition-all"
      style={{
        background: 'var(--ui-panel-subtle)',
        borderColor: 'var(--ui-border)',
      }}
    >
      <div className="mb-3 flex items-center gap-4">
        <div
          className={cn(
            'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md border',
            iconColor,
          )}
          style={{
            background: 'var(--ui-panel)',
            borderColor: 'var(--ui-border)',
          }}
        >
          {icon}
        </div>
        <div className="flex-1">
          <h3
            className="m-0 mb-1 text-sm font-medium"
            style={{ color: 'var(--ui-text)' }}
          >
            {label}
          </h3>
          {description && (
            <p
              className="m-0 text-xs"
              style={{ color: 'var(--ui-muted)' }}
            >
              {description}
            </p>
          )}
        </div>
        <span
          className="min-w-[44px] text-right text-sm font-semibold"
          style={{ color: 'var(--ui-text)' }}
        >
          {displayValue}
        </span>
      </div>

      <div className="pl-14">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="slider-input w-full"
          style={{
            background: `linear-gradient(90deg, var(--ui-primary) ${ratio}%, var(--ui-border) ${ratio}%)`,
          }}
        />
      </div>
    </div>
  )
}

function StyledSelect({
  value,
  options,
  onChange,
}: {
  value: string
  options: { value: string; label: string }[]
  onChange: (val: string) => void
}) {
  return (
    <select
      className="w-full rounded-lg border px-3 py-2 text-sm"
      style={{
        background: 'var(--ui-panel)',
        borderColor: 'var(--ui-border)',
        color: 'var(--ui-text)',
      }}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

function AboutRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span
        className="text-xs font-medium"
        style={{ color: 'var(--ui-muted)' }}
      >
        {label}
      </span>
      <span
        className="text-xs font-semibold"
        style={{ color: 'var(--ui-text)' }}
      >
        {value}
      </span>
    </div>
  )
}
