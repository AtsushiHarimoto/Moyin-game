import { useCallback, useMemo, type ChangeEvent } from 'react'
import { cn } from '@/lib/cn'

interface SliderProps {
  value: number
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  showValue?: boolean
  formatValue?: (value: number) => string
  className?: string
  onChange: (value: number) => void
  onChangeComplete?: (value: number) => void
}

export default function Slider({
  value,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  showValue = true,
  formatValue = String,
  className,
  onChange,
  onChangeComplete,
}: SliderProps) {
  const ratio = useMemo(() => {
    const span = max - min
    if (!span) return 0
    return ((value - min) / span) * 100
  }, [value, min, max])

  const sliderBackground = useMemo(
    () => `linear-gradient(90deg, var(--ui-primary) ${ratio}%, var(--ui-border) ${ratio}%)`,
    [ratio],
  )

  const displayValue = useMemo(() => formatValue(value), [formatValue, value])

  const handleInput = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onChange(Number(event.target.value))
    },
    [onChange],
  )

  const handleChangeComplete = useCallback(() => {
    onChangeComplete?.(value)
  }, [onChangeComplete, value])

  return (
    <label
      className={cn(
        'inline-flex w-full items-center gap-3',
        disabled && 'pointer-events-none opacity-60',
        className,
      )}
    >
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        className="slider-input h-1 flex-1 cursor-pointer appearance-none rounded-full outline-none"
        style={{ background: sliderBackground }}
        onChange={handleInput}
        onMouseUp={handleChangeComplete}
        onTouchEnd={handleChangeComplete}
      />
      {showValue && (
        <div
          className="min-w-[40px] text-right font-semibold"
          style={{ color: 'var(--ui-text)' }}
        >
          {displayValue}
        </div>
      )}

      {/* Thumb styling via global CSS - using inline style tag for range thumb */}
      <style>{`
        .slider-input::-webkit-slider-thumb {
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--ui-inverse, #fff);
          border: 2px solid var(--ui-primary);
          box-shadow: var(--ui-shadow-soft);
          cursor: pointer;
          transition: transform 0.2s ease;
        }
        .slider-input::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--ui-inverse, #fff);
          border: 2px solid var(--ui-primary);
          box-shadow: var(--ui-shadow-soft);
          cursor: pointer;
        }
        .slider-input:focus-visible::-webkit-slider-thumb {
          outline: none;
          box-shadow: var(--ui-shadow-soft), var(--ui-focus-shadow);
        }
      `}</style>
    </label>
  )
}
