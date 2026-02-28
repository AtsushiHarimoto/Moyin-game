import { useCallback, useEffect, useRef, useState } from 'react'

interface DialogueBoxProps {
  speaker: string
  text: string
  typewriter?: boolean
  showNextHint?: boolean
  onClick?: () => void
  promptSlot?: React.ReactNode
}

/** Adaptive typing delay -- CJK punctuation and special characters get longer pauses. */
function getTypingDelay(char: string, nextChar?: string): number {
  if (char === '\n') return 160;      // 換行
  if (char === '…') return 320;       // 省略號
  if (char === '.' && nextChar === '.') return 0;  // 連點
  if ('。！？!?'.includes(char)) return 240;       // 句號/驚嘆/問號
  if ('，、；;:'.includes(char)) return 120;       // 逗號/分號
  return 35;                          // 預設
}

export function DialogueBox({
  speaker,
  text,
  typewriter = true,
  showNextHint = false,
  onClick,
  promptSlot,
}: DialogueBoxProps) {
  // ---- Typewriter state ----
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const indexRef = useRef(0)
  const fullTextRef = useRef(text)

  // Clear any running timer
  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // Start typewriter effect when text changes
  useEffect(() => {
    fullTextRef.current = text

    if (!typewriter || !text) {
      setDisplayedText(text)
      setIsTyping(false)
      clearTimer()
      return
    }

    // Reset and begin typing
    indexRef.current = 0
    setDisplayedText('')
    setIsTyping(true)

    const tick = () => {
      indexRef.current += 1
      const next = fullTextRef.current.slice(0, indexRef.current)
      setDisplayedText(next)

      if (indexRef.current >= fullTextRef.current.length) {
        setIsTyping(false)
        timerRef.current = null
      } else {
        const currentChar = fullTextRef.current[indexRef.current - 1]
        const nextChar = fullTextRef.current[indexRef.current]
        const delay = getTypingDelay(currentChar, nextChar)
        timerRef.current = setTimeout(tick, delay)
      }
    }

    const firstChar = fullTextRef.current[0]
    const secondChar = fullTextRef.current[1]
    const initialDelay = getTypingDelay(firstChar, secondChar)
    timerRef.current = setTimeout(tick, initialDelay)

    return () => {
      clearTimer()
    }
  }, [text, typewriter, clearTimer])

  // Skip to full text
  const skipTypewriter = useCallback(() => {
    if (isTyping) {
      clearTimer()
      setDisplayedText(fullTextRef.current)
      setIsTyping(false)
    }
  }, [isTyping, clearTimer])

  // Handle click: skip typewriter first, otherwise forward to onClick
  const handleClick = useCallback(() => {
    if (isTyping) {
      skipTypewriter()
    } else {
      onClick?.()
    }
  }, [isTyping, skipTypewriter, onClick])

  return (
    <div
      className="dialogue-box absolute inset-x-0 bottom-0 z-[500] flex select-none flex-col items-center"
      style={{
        padding: '0 var(--space-4, 16px) var(--space-1, 4px)',
        pointerEvents: 'none',
      }}
      data-testid="dialogue-box"
    >
      {/* Main glass panel */}
      <div
        className="dialogue-box__container relative mx-auto w-full max-w-[78rem] cursor-pointer overflow-hidden"
        style={{
          padding: 'var(--space-8, 48px)',
          paddingTop: 'calc(var(--space-8, 48px) + var(--space-5, 24px))',
          minHeight: 'calc(var(--space-12, 80px) + var(--space-8, 48px))',
          background: 'color-mix(in srgb, var(--ui-panel) 45%, transparent)',
          border: '1px solid color-mix(in srgb, var(--ui-text) 8%, transparent)',
          borderRadius: 'var(--ui-radius-lg)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          boxShadow: 'var(--ui-shadow-strong)',
          boxSizing: 'content-box',
          pointerEvents: 'auto',
        }}
        onClick={handleClick}
      >
        {/* Prompt slot (top-right of dialogue area) */}
        {promptSlot && (
          <div
            className="dialogue-box__prompt absolute z-10"
            style={{ top: 'var(--space-4, 16px)', right: 'var(--space-5, 24px)' }}
          >
            {promptSlot}
          </div>
        )}

        {/* Speaker name */}
        {speaker && (
          <div className="dialogue-box__speaker-wrapper absolute z-10 select-none" style={{ left: 'var(--space-10, 64px)', top: 'var(--space-8, 48px)' }}>
            <h2
              className="dialogue-box__speaker m-0 text-xl font-bold tracking-[0.15em] glow-pulse"
              style={{
                fontFamily: 'var(--ui-font-special)',
                color: 'var(--ui-text)',
                textShadow:
                  '0 0 10px color-mix(in srgb, var(--ui-primary) 70%, transparent), ' +
                  '0 0 20px color-mix(in srgb, var(--ui-primary) 40%, transparent), ' +
                  '0 0 30px color-mix(in srgb, var(--ui-primary) 20%, transparent)',
              }}
            >
              {speaker}
            </h2>
          </div>
        )}

        {/* Top gradient line */}
        <div
          className="dialogue-box__divider absolute inset-x-0 top-0 h-px opacity-50"
          style={{
            background: 'linear-gradient(to right, transparent, color-mix(in srgb, var(--ui-primary) 50%, transparent), transparent)',
          }}
        />

        {/* Text area */}
        <div
          aria-live="polite"
          className="dialogue-box__content text-base leading-[1.7] tracking-[0.03em] lg:text-lg"
          style={{
            color: 'var(--ui-text)',
            textShadow: '0 2px 4px color-mix(in srgb, var(--ui-bg) 30%, transparent)',
          }}
        >
          {typewriter ? displayedText : text}
        </div>

        {/* Next indicator: V1 parity (arrow-only, no label) */}
        {showNextHint && !isTyping && (
          <div
            className="dialogue-box__next-hint absolute bottom-4 right-6 flex items-center"
            style={{
              color: 'var(--ui-primary)',
              filter: 'drop-shadow(0 0 8px var(--ui-primary))',
            }}
            data-testid="btn-next"
          >
            <span className="inline-flex animate-pulse">
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
