import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'

interface TypewriterTextProps {
  text: string
  speed?: number
  instant?: boolean
  punctuationPause?: number
  className?: string
  onStart?: () => void
  onFinish?: () => void
}

const PUNCTUATION_RE = /[，。、！？!?]/

export default function TypewriterText({
  text,
  speed = 24,
  instant = false,
  punctuationPause = 200,
  className,
  onStart,
  onFinish,
}: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const indexRef = useRef(0)
  const fullTextRef = useRef(text)

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => {
    fullTextRef.current = text
    clearTimer()

    if (!text) {
      setDisplayedText('')
      onFinish?.()
      return
    }

    if (instant) {
      setDisplayedText(text)
      onFinish?.()
      return
    }

    onStart?.()
    indexRef.current = 0

    function step() {
      indexRef.current += 1
      const next = fullTextRef.current.slice(0, indexRef.current)
      setDisplayedText(next)

      if (indexRef.current >= fullTextRef.current.length) {
        timerRef.current = null
        onFinish?.()
        return
      }

      const char = fullTextRef.current[indexRef.current - 1]
      const delay = PUNCTUATION_RE.test(char) ? punctuationPause : speed
      timerRef.current = setTimeout(step, delay)
    }

    step()

    return () => clearTimer()
  }, [text, instant, speed, punctuationPause, clearTimer, onStart, onFinish])

  return (
    <span
      className={cn('inline whitespace-pre-wrap leading-relaxed', className)}
      style={{
        color: 'var(--ui-text)',
        fontSize: 16,
      }}
      aria-live="polite"
    >
      {displayedText}
    </span>
  )
}
