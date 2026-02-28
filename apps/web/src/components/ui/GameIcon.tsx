import { useMemo } from 'react'

const iconModules = import.meta.glob('../../assets/icons/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

function normalizeSvgMarkup(raw: string): string {
  const cleaned = raw
    .replace(/\swidth="[^"]*"/g, '')
    .replace(/\sheight="[^"]*"/g, '')
  return cleaned.replace(
    '<svg',
    '<svg width="100%" height="100%" style="display:block;width:100%;height:100%;"',
  )
}

const iconMap: Record<string, string> = Object.fromEntries(
  Object.entries(iconModules).map(([filePath, raw]) => {
    const fileName = filePath.split('/').pop() || ''
    const iconName = fileName.replace('.svg', '')
    return [iconName, normalizeSvgMarkup(raw)]
  }),
)

interface GameIconProps {
  name: string
  size?: number | string
  color?: string
  title?: string
  className?: string
}

/**
 * GameIcon - drop-in replacement for the Vue Icon component.
 * Uses bundled local SVG assets to keep V1/V2 icon rendering consistent.
 */
export default function GameIcon({
  name,
  size = 20,
  color = '',
  title = '',
  className,
}: GameIconProps) {
  const resolvedSize = useMemo(() => {
    const value = Number(size ?? 20)
    return Number.isFinite(value) && value > 0 ? value : 20
  }, [size])
  const wrapperClassName = className
    ? `inline-flex items-center justify-center align-middle ${className}`
    : 'inline-flex items-center justify-center align-middle'

  const iconContent = iconMap[name]
  const label = title || name

  if (!iconContent) {
    return (
      <span
        className={`${wrapperClassName} rounded-full`}
        style={{
          width: `${resolvedSize}px`,
          height: `${resolvedSize}px`,
          background: 'rgba(255, 255, 255, 0.1)',
        }}
        aria-hidden="true"
      />
    )
  }

  return (
    <span
      className={wrapperClassName}
      style={{
        width: `${resolvedSize}px`,
        height: `${resolvedSize}px`,
        color: color || 'currentColor',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        verticalAlign: 'middle',
      }}
      aria-label={label}
      role="img"
      dangerouslySetInnerHTML={{ __html: iconContent }}
    />
  )
}
