import { useUiStore } from '@/stores/useUiStore'
import SakuraScene from '@/components/effects/SakuraScene'
import MatrixRain from '@/components/effects/MatrixRain'
import { DISABLE_ANIMATIONS } from '@/config/env'

interface GlobalBackgroundProps {
  noAnim?: boolean
  theme?: string
  enableParticles?: boolean
}

export default function GlobalBackground({
  noAnim = false,
  theme = 'sakura',
  enableParticles = true,
}: GlobalBackgroundProps) {
  const enableSakura = useUiStore((s) => s.enableSakura)

  const normalizedTheme = (theme || '').toLowerCase().trim().replace(/_/g, '-')
  const showSakura = enableParticles && enableSakura && normalizedTheme !== 'eye-care' && normalizedTheme !== 'hack'
  const showMatrix = enableParticles && normalizedTheme === 'hack'

  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: 'var(--z-background)' }}
    >
      {/* Base gradient layer */}
      <div className="page-bg-standard absolute inset-0" />

      {enableParticles && !noAnim && !DISABLE_ANIMATIONS && (
        <div
          className="absolute inset-0"
          style={{ zIndex: 'var(--z-particles)' }}
        >
          {showSakura && <SakuraScene />}
          {showMatrix && <MatrixRain />}
        </div>
      )}
    </div>
  )
}
