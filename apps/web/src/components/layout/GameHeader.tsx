import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import brandSakuraUrl from '@/assets/icons/brand-sakura.svg'
import sakuraIconUrl from '@/assets/icons/sakura.svg'

export interface Tab {
  value: string
  name: string
  icon?: string
}

interface GameHeaderProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (value: string) => void
  onAbout?: () => void
  actions?: ReactNode
}

const TAB_BASE_CLASSES = 'relative border-none bg-transparent px-0 py-2 text-[10px] font-bold uppercase tracking-[0.1em] transition-colors cursor-pointer md:text-sm md:tracking-[0.15em]'
const HEADER_ACTION_CLASSES = 'flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-medium uppercase tracking-[0.05em] transition-all hover:border-[color-mix(in_srgb,var(--ui-primary)_40%,transparent)]'

export default function GameHeader({
  tabs,
  activeTab,
  onTabChange,
  onAbout,
  actions,
}: GameHeaderProps) {
  const { t } = useTranslation()

  return (
    <header
      className="sticky top-0 z-[var(--z-dock)] w-full border-b"
      style={{
        background: 'var(--ui-panel-glass)',
        borderColor: 'var(--ui-panel-glass-border)',
        height: 'var(--header-height, 80px)',
      }}
      data-testid="game-header"
    >
      <div className="mx-auto flex h-full w-full max-w-[1400px] items-center justify-between px-4 md:px-6">
        {/* Left: Logo + Title */}
        <div className="flex items-center">
          <Link to="/" className="flex items-center gap-3 no-underline">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl border"
              style={{
                background: 'var(--ui-panel-subtle)',
                borderColor: 'var(--ui-panel-glass-border)',
                boxShadow: '0 0 15px color-mix(in srgb, var(--ui-primary) 20%, transparent)',
              }}
            >
              <img
                src={brandSakuraUrl}
                alt="Moyin"
                className="h-[12px] w-[24px] logo-breathe"
              />
            </div>
            <h2
              className="m-0 hidden text-lg font-bold tracking-[0.1em] md:inline"
              style={{
                fontFamily: 'var(--ui-font-special)',
                color: 'var(--ui-text)',
                textShadow: '0 0 15px color-mix(in srgb, var(--ui-primary) 60%, transparent)',
              }}
            >
              Moyin Game
            </h2>
          </Link>
        </div>

        {/* Center: Navigation Tabs */}
        <nav className="flex items-center gap-10 max-md:gap-5" role="navigation">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              className={cn(TAB_BASE_CLASSES)}
              style={{
                fontFamily: 'var(--ui-font-main)',
                color: activeTab === tab.value ? 'var(--ui-primary)' : 'var(--ui-muted)',
                textShadow:
                  activeTab === tab.value
                    ? '0 0 15px color-mix(in srgb, var(--ui-primary) 60%, transparent)'
                    : undefined,
              }}
              data-testid={`tab-${tab.value}`}
              onClick={() => onTabChange(tab.value)}
            >
              {tab.name}
              {activeTab === tab.value && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-px"
                  style={{
                    background: 'var(--ui-primary)',
                    boxShadow: '0 0 8px var(--ui-primary)',
                  }}
                />
              )}
            </button>
          ))}
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {actions ?? (
            <button
              className={HEADER_ACTION_CLASSES}
              style={{
                background: 'var(--ui-panel-subtle)',
                borderColor: 'var(--ui-panel-glass-border)',
                color: 'var(--ui-muted)',
                fontFamily: 'var(--ui-font-main)',
              }}
              title={t('message.about') || 'About'}
              onClick={onAbout}
            >
              <img src={sakuraIconUrl} alt="About" className="h-[18px] w-[18px] opacity-80" />
              <span className="uppercase">About</span>
            </button>
          )}
        </div>
      </div>
      <style>{`
        .logo-breathe {
          animation: logo-breathe 3s ease-in-out infinite;
        }
        @keyframes logo-breathe {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
            filter: drop-shadow(0 0 4px rgba(244, 171, 186, 0.3));
          }
          50% {
            opacity: 0.5;
            transform: scale(1.15);
            filter: drop-shadow(0 0 20px rgba(244, 171, 186, 0.9));
          }
        }
      `}</style>
    </header>
  )
}
