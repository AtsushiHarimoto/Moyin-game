import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

interface SplashScreenProps {
  avatarImgUrl?: string
  title?: string
  slogan?: string
  onComplete?: () => void
}

const STATUS_MESSAGES = [
  'LOADING EMOTIONS...',
  'SYNCING HEARTS...',
  'CALIBRATING ROMANCE...',
  'READY!',
]

export default function SplashScreen({
  avatarImgUrl = '/img/girl.png',
  title = 'Moyin',
  slogan = '你的小可愛正在來的路路...',
  onComplete,
}: SplashScreenProps) {
  const [statusText, setStatusText] = useState('INITIALIZING...')
  const [progress, setProgress] = useState(0)
  const statusIndexRef = useRef(0)
  const prefersReducedMotion = useRef(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      prefersReducedMotion.current = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches
    }
  }, [])

  // Status text loop
  useEffect(() => {
    if (prefersReducedMotion.current) {
      setStatusText(STATUS_MESSAGES[STATUS_MESSAGES.length - 1])
      return
    }

    const interval = setInterval(() => {
      if (statusIndexRef.current < STATUS_MESSAGES.length) {
        setStatusText(STATUS_MESSAGES[statusIndexRef.current])
        statusIndexRef.current += 1
      } else {
        clearInterval(interval)
      }
    }, 800)

    return () => clearInterval(interval)
  }, [])

  // Progress bar animation
  useEffect(() => {
    if (prefersReducedMotion.current) {
      setProgress(100)
      return
    }

    const duration = 3500
    const startTime = performance.now()

    function tick(now: number) {
      const elapsed = now - startTime
      const pct = Math.min((elapsed / duration) * 100, 100)
      setProgress(pct)

      if (pct < 100) {
        requestAnimationFrame(tick)
      } else {
        onComplete?.()
      }
    }

    const frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [onComplete])

  const heartClipPath =
    'M0.5,0.95 C0.5,0.95 0.1,0.65 0.1,0.35 Q0.1,0.1 0.3,0.1 Q0.4,0.1 0.5,0.3 Q0.6,0.1 0.7,0.1 Q0.9,0.1 0.9,0.35 C0.9,0.65 0.5,0.95 0.5,0.95Z'

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
      style={{
        fontFamily: 'var(--ui-font-main)',
        background: 'var(--ui-page-bg-stop-1)',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.5 }}
    >
      {/* Background gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle, var(--ui-inverse) 0%, var(--ui-page-bg-stop-1) 60%, var(--ui-page-bg-stop-2) 100%)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex w-full max-w-[800px] flex-col items-center">
        {/* Heart avatar */}
        <motion.div
          className="relative mb-4"
          style={{
            width: 'min(35vh, 280px)',
            height: 'min(35vh, 280px)',
            filter:
              'drop-shadow(0 0 15px color-mix(in srgb, var(--ui-inverse) 80%, transparent)) drop-shadow(0 0 30px color-mix(in srgb, var(--ui-primary) 40%, transparent))',
          }}
          animate={
            prefersReducedMotion.current
              ? undefined
              : { scale: [1, 1.05, 1] }
          }
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <img
            src={avatarImgUrl}
            alt="Loading Avatar"
            className="h-full w-full object-cover"
            style={{
              clipPath: 'url(#heart-clip-splash)',
              backgroundColor: 'var(--ui-inverse)',
            }}
          />
          {/* SVG clip-path definition */}
          <svg width="0" height="0">
            <defs>
              <clipPath id="heart-clip-splash" clipPathUnits="objectBoundingBox">
                <path d={heartClipPath} />
              </clipPath>
            </defs>
          </svg>
          {/* Heart border */}
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 1 1"
            preserveAspectRatio="none"
          >
            <path
              d={heartClipPath}
              fill="none"
              stroke="white"
              strokeWidth="0.02"
            />
          </svg>
        </motion.div>

        {/* Title */}
        <motion.h1
          className="m-0 text-center tracking-wider"
          style={{
            fontSize: 'var(--ui-font-hero, 3rem)',
            color: 'var(--ui-primary)',
            fontWeight: 'var(--ui-weight-heavy, 900)',
            WebkitTextStroke: '1.5px var(--ui-inverse)',
            textShadow:
              '4px 4px 0px color-mix(in srgb, var(--ui-inverse) 50%, transparent), 0 0 20px color-mix(in srgb, var(--ui-primary) 60%, transparent)',
            lineHeight: 1.1,
          }}
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 1.2, ease: 'backOut' }}
        >
          {title}
        </motion.h1>

        {/* Slogan */}
        <motion.p
          className="mt-1 text-center tracking-wider"
          style={{
            fontSize: 'var(--ui-font-lg)',
            color: 'var(--ui-primary-active)',
            fontWeight: 'var(--ui-weight-semibold, 600)',
          }}
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8, duration: 1.2, ease: 'backOut' }}
        >
          {slogan}
        </motion.p>

        {/* Energy bar */}
        <div className="mt-6 flex w-[300px] flex-col items-center">
          <div
            className="relative w-full overflow-hidden rounded-full"
            style={{
              height: 12,
              background: 'color-mix(in srgb, var(--ui-inverse) 50%, transparent)',
              border: '2px solid var(--ui-inverse)',
              boxShadow: '0 0 10px color-mix(in srgb, var(--ui-primary) 30%, transparent)',
            }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${progress}%`,
                background: 'var(--ui-gradient-primary)',
                boxShadow: '0 0 10px var(--ui-primary-hover)',
                transition: 'width 0.1s linear',
              }}
            />
            {/* Shine */}
            <div
              className="pointer-events-none absolute inset-0 animate-[splash-shine_2s_infinite_linear]"
              style={{
                background:
                  'linear-gradient(90deg, transparent, color-mix(in srgb, var(--ui-inverse) 60%, transparent), transparent)',
                transform: 'skewX(-20deg) translateX(-100%)',
              }}
            />
          </div>
          <div
            className="mt-4 text-center text-base font-bold uppercase tracking-wider"
            style={{
              fontFamily: 'var(--ui-font-mono)',
              color: 'var(--ui-hotkey-text, var(--ui-muted))',
            }}
          >
            {statusText}
          </div>
        </div>
      </div>

      {/* Keyframe for shine animation */}
      <style>{`
        @keyframes splash-shine {
          0% { transform: skewX(-20deg) translateX(-100%); }
          100% { transform: skewX(-20deg) translateX(200%); }
        }
      `}</style>
    </motion.div>
  )
}
