import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import { cn } from '@/lib/cn'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InputItemProps {
  value?: string
  onChange?: (value: string) => void
  onSend?: (message: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}

export interface InputItemHandle {
  focus: () => void
  clear: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const InputItem = forwardRef<InputItemHandle, InputItemProps>(function InputItem(
  { value: controlledValue, onChange, onSend, disabled = false, placeholder, className },
  ref,
) {
  const [internalValue, setInternalValue] = useState(controlledValue ?? '')
  const message = controlledValue ?? internalValue
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [shaking, setShaking] = useState(false)

  // Sync controlled value
  useEffect(() => {
    if (controlledValue !== undefined) {
      setInternalValue(controlledValue)
    }
  }, [controlledValue])

  // Auto-resize textarea
  const autoResize = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const maxHeight = window.innerHeight * 0.3 + 20
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`
  }, [])

  useEffect(() => {
    autoResize()
  }, [message, autoResize])

  // Expose imperative handle
  useImperativeHandle(ref, () => ({
    focus() {
      textareaRef.current?.focus()
    },
    clear() {
      setInternalValue('')
      onChange?.('')
    },
  }))

  const updateValue = useCallback(
    (val: string) => {
      setInternalValue(val)
      onChange?.(val)
    },
    [onChange],
  )

  const sendMessage = useCallback(() => {
    if (!message.trim()) return
    onSend?.(message)
    updateValue('')
  }, [message, onSend, updateValue])

  const handleKeydown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key !== 'Enter' || e.nativeEvent.isComposing) return

      e.preventDefault()

      if (e.shiftKey) {
        updateValue(message + '\n')
        return
      }

      if (disabled) return

      // Validate non-empty
      if (!/\S/.test(message)) {
        e.stopPropagation()
        setShaking(true)
        setTimeout(() => setShaking(false), 1000)
        return
      }

      sendMessage()
    },
    [message, disabled, updateValue, sendMessage],
  )

  return (
    <div
      className={cn(
        'relative mx-2.5 flex rounded-xl border transition-all',
        'focus-within:border-[var(--ui-primary)] focus-within:shadow-[var(--ui-focus-shadow)]',
        className,
      )}
      style={{
        background: 'var(--ui-panel-glass)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderColor: 'var(--ui-panel-glass-border)',
        boxShadow: 'var(--ui-shadow-soft)',
      }}
    >
      <div className="flex flex-1 items-center rounded-xl bg-transparent px-[15px] pb-2 pt-3">
        <textarea
          ref={textareaRef}
          className={cn(
            'flex-1 resize-none overflow-auto border-none bg-transparent p-0 outline-none',
            shaking && 'animate-[input-shake_0.3s_linear] border border-[var(--ui-danger)]',
          )}
          style={{
            fontSize: 'var(--ui-font-lg)',
            fontFamily: 'var(--ui-font-main)',
            lineHeight: 1.4,
            color: 'var(--ui-text)',
            scrollbarWidth: 'none',
          }}
          placeholder={placeholder}
          value={message}
          onFocus={() => textareaRef.current?.focus()}
          onInput={(e) => updateValue(e.currentTarget.value)}
          onKeyDown={handleKeydown}
        />
      </div>

      {disabled && (
        <div
          className="absolute bottom-1/2 right-[1.5vh] translate-y-1/2"
          style={{ width: '2.5vh', height: '2.5vh' }}
        >
          <svg
            className="h-full w-full animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            style={{ color: 'var(--ui-primary)' }}
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}
    </div>
  )
})

export default InputItem
