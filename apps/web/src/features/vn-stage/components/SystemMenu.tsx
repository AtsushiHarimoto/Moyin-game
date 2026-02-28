import { useCallback, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SystemMenuProps {
  open: boolean
  onClose?: () => void
  onSelect?: (action: string) => void
}

interface MenuItem {
  id: string
  label: string
  icon: string
  disabled: boolean
}

// ---------------------------------------------------------------------------
// Icon map (inline SVG for each menu icon)
// ---------------------------------------------------------------------------

function MenuIcon({ name, size = 20 }: { name: string; size?: number }) {
  const s = `${size}px`
  const common = { width: s, height: s, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

  switch (name) {
    case 'save':
      return (
        <svg {...common}>
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
          <polyline points="17 21 17 13 7 13 7 21" />
          <polyline points="7 3 7 8 15 8" />
        </svg>
      )
    case 'folder-open':
      return (
        <svg {...common}>
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      )
    case 'history':
      return (
        <svg {...common}>
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
        </svg>
      )
    case 'settings':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      )
    case 'home':
      return (
        <svg {...common}>
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      )
    case 'arrow-right':
      return (
        <svg {...common} width={`${size}px`} height={`${size}px`}>
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      )
    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// Corner Decoration SVG
// ---------------------------------------------------------------------------

function CornerDeco() {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
      <path d="M2 20V2H20" stroke="var(--ui-imperial-gold)" strokeWidth="1.5" />
      <rect x="2" y="2" width="4" height="4" fill="var(--ui-imperial-gold)" />
      <path d="M6 2H12L16 6H24" stroke="var(--ui-imperial-gold)" strokeOpacity="0.5" strokeWidth="0.5" />
      <path d="M2 6V12L6 16V24" stroke="var(--ui-imperial-gold)" strokeOpacity="0.5" strokeWidth="0.5" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SystemMenu({ open, onClose, onSelect }: SystemMenuProps) {
  const { t } = useTranslation()

  const menuItems: MenuItem[] = useMemo(
    () => [
      { id: 'save', label: t('message.btn_save', 'Save'), icon: 'save', disabled: false },
      { id: 'load', label: t('message.tab_load', 'Load'), icon: 'folder-open', disabled: false },
      { id: 'backlog', label: t('message.vn_stage_history', 'History'), icon: 'history', disabled: false },
      { id: 'settings', label: t('message.setting_menu', 'Settings'), icon: 'settings', disabled: false },
      { id: 'title', label: t('message.vn_stage_back', 'Title Screen'), icon: 'home', disabled: false },
    ],
    [t],
  )

  const handleSelect = useCallback(
    (id: string) => {
      onSelect?.(id)
    },
    [onSelect],
  )

  // ESC key listener
  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', handleEsc)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleEsc)
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[2000] flex items-center justify-center overflow-hidden p-5"
          style={{
            background: 'var(--ui-vn-overlay-bg)',
            backdropFilter: 'blur(8px)',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose?.()
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Background Layer */}
          <div className="pointer-events-none absolute inset-0 z-0">
            {/* Scanlines */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                background: `linear-gradient(to bottom, transparent, transparent 50%, color-mix(in srgb, var(--ui-text) 10%, transparent) 50%, color-mix(in srgb, var(--ui-text) 10%, transparent))`,
                backgroundSize: '100% 4px',
              }}
            />
            {/* Glow orbs */}
            <div
              className="absolute -left-[10%] -top-[20%] h-[50vw] w-[50vw] rounded-full opacity-20 mix-blend-screen"
              style={{ background: 'var(--ui-primary)', filter: 'blur(120px)' }}
            />
            <div
              className="absolute -bottom-[20%] -right-[10%] h-[50vw] w-[50vw] rounded-full opacity-20 mix-blend-screen"
              style={{ background: 'var(--ui-primary)', filter: 'blur(120px)' }}
            />
          </div>

          {/* Menu Container */}
          <motion.div
            className="relative z-10 flex w-full max-w-[400px] flex-col overflow-hidden rounded-md border shadow-2xl"
            style={{
              borderColor: 'var(--ui-imperial-gold-soft)',
              background: 'var(--ui-panel)',
              boxShadow: '0 16px 48px color-mix(in srgb, var(--ui-bg) 60%, transparent)',
            }}
            role="dialog"
            aria-modal
            data-testid="vn-system-menu"
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
          >
            {/* Inner shadow overlay */}
            <div className="pointer-events-none absolute inset-0" style={{ boxShadow: 'inset 0 0 40px color-mix(in srgb, var(--ui-bg) 60%, transparent)' }} />

            {/* Corner Decorations */}
            <div className="pointer-events-none absolute left-0 top-0 z-20 h-16 w-16"><CornerDeco /></div>
            <div className="pointer-events-none absolute right-0 top-0 z-20 h-16 w-16 rotate-90"><CornerDeco /></div>
            <div className="pointer-events-none absolute bottom-0 left-0 z-20 h-16 w-16 -rotate-90"><CornerDeco /></div>
            <div className="pointer-events-none absolute bottom-0 right-0 z-20 h-16 w-16 rotate-180"><CornerDeco /></div>

            {/* Header */}
            <div className="relative flex flex-col items-center px-6 pb-5 pt-6 text-center">
              <div
                className="absolute left-0 top-6 h-px w-full"
                style={{ background: 'linear-gradient(to right, transparent, color-mix(in srgb, var(--ui-imperial-gold) 20%, transparent), transparent)' }}
              />
              <div
                className="mb-2 text-[10px] font-bold uppercase tracking-[0.25em] opacity-60"
                style={{ color: 'var(--ui-muted)' }}
              >
                {t('message.vn_stage_brand')}
              </div>
              <h2
                className="m-0 text-xl font-bold tracking-[0.2em]"
                style={{
                  color: 'var(--ui-text)',
                  fontFamily: 'var(--ui-font-display)',
                  textShadow: '0 0 10px color-mix(in srgb, var(--ui-text) 20%, transparent)',
                }}
              >
                {t('message.vn_stage_menu_title')}
              </h2>
              {/* Title Divider */}
              <div className="mt-5 flex w-full items-center justify-center gap-2 opacity-80">
                <div className="h-px w-16" style={{ background: 'linear-gradient(to right, transparent, var(--ui-imperial-gold))' }} />
                <div
                  className="h-2 w-2 rotate-45 border"
                  style={{
                    borderColor: 'var(--ui-imperial-gold)',
                    background: 'var(--ui-bg)',
                    boxShadow: '0 0 5px var(--ui-imperial-gold)',
                  }}
                />
                <div className="h-px w-16" style={{ background: 'linear-gradient(to left, transparent, var(--ui-imperial-gold))' }} />
              </div>
            </div>

            {/* Menu Items */}
            <div className="flex flex-col gap-3 px-6 pb-6">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`group relative flex w-full items-center justify-between overflow-hidden rounded-md px-5 py-3 border-none bg-transparent cursor-pointer transition-all
                    ${item.disabled ? 'cursor-not-allowed opacity-50' : ''}`}
                  onClick={() => !item.disabled && handleSelect(item.id)}
                >
                  {/* Highlight border on hover */}
                  <div
                    className="pointer-events-none absolute inset-0 rounded-md border opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{
                      borderColor: 'var(--ui-primary)',
                      boxShadow: '0 0 12px color-mix(in srgb, var(--ui-primary) 40%, transparent), inset 0 0 8px color-mix(in srgb, var(--ui-primary) 10%, transparent)',
                    }}
                  />
                  {/* Background */}
                  <div
                    className="absolute inset-0 transition-colors"
                    style={{ background: 'color-mix(in srgb, var(--ui-text) 3%, transparent)' }}
                  />

                  {/* Content */}
                  <div className="relative z-10 flex items-center gap-4">
                    <div
                      className="flex h-6 w-6 items-center justify-center rounded-md transition-all"
                      style={{
                        background: 'color-mix(in srgb, var(--ui-imperial-gold) 10%, transparent)',
                        color: 'var(--ui-imperial-gold)',
                      }}
                    >
                      <MenuIcon name={item.icon} size={20} />
                    </div>
                    <span
                      className="text-sm font-medium tracking-[0.05em] transition-all"
                      style={{ color: 'var(--ui-muted)' }}
                    >
                      {item.label}
                    </span>
                  </div>

                  {/* Arrow */}
                  <div
                    className="relative z-10 opacity-30 transition-all duration-200 group-hover:translate-x-1 group-hover:opacity-100"
                    style={{ color: 'var(--ui-text)' }}
                  >
                    <MenuIcon name="arrow-right" size={14} />
                  </div>
                </button>
              ))}
            </div>

            {/* Footer */}
            <div className="flex justify-center pb-5">
              <div className="flex items-center gap-2 opacity-40">
                <div className="h-px w-8" style={{ background: 'var(--ui-imperial-gold)' }} />
                <div
                  className="h-1 w-1 rounded-full"
                  style={{ background: 'var(--ui-imperial-gold)', boxShadow: '0 0 4px var(--ui-imperial-gold)' }}
                />
                <div className="h-px w-8" style={{ background: 'var(--ui-imperial-gold)' }} />
              </div>
            </div>

            {/* Bottom gradient line */}
            <div
              className="absolute bottom-0 left-0 h-1 w-full"
              style={{ background: 'linear-gradient(to right, transparent, color-mix(in srgb, var(--ui-imperial-gold) 40%, transparent), transparent)' }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
