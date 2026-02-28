import { cn } from '../../../lib/cn'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ThemeVariantEntry {
  theme: string
  svgPath: string
}

export interface IconEntry {
  id: string
  name: string
  category: string
  tags: string[]
  svgPath: string
  themeVariants?: ThemeVariantEntry[] | Record<string, string>
}

interface IconGalleryProps {
  icons: IconEntry[]
  selectedId: string
  theme: string
  previewMap: Record<string, string>
  onSelect: (id: string) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolvePath(
  icon: IconEntry,
  theme: string,
  previewMap: Record<string, string>,
): string {
  let path = icon.svgPath

  if (theme && icon.themeVariants) {
    if (Array.isArray(icon.themeVariants)) {
      const variant = icon.themeVariants.find((item) => item.theme === theme)
      path = variant?.svgPath ?? icon.svgPath
    } else {
      path = icon.themeVariants[theme] ?? icon.svgPath
    }
  }

  return previewMap[path] ?? path
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function IconGallery({
  icons,
  selectedId,
  theme,
  previewMap,
  onSelect,
}: IconGalleryProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3">
      {icons.map((icon) => {
        const src = resolvePath(icon, theme, previewMap)
        return (
          <button
            key={icon.id}
            type="button"
            className={cn(
              'flex flex-col items-center gap-2 rounded-lg border bg-gray-900/60 p-3',
              'cursor-pointer transition-all duration-200',
              'hover:-translate-y-0.5 hover:shadow-md',
              icon.id === selectedId
                ? 'border-blue-500 shadow-lg'
                : 'border-gray-700',
            )}
            onClick={() => onSelect(icon.id)}
          >
            {src && (
              <img src={src} alt={icon.name} className="h-12 w-12" />
            )}
            <span className="text-center text-xs text-gray-400">
              {icon.name}
            </span>
          </button>
        )
      })}
    </div>
  )
}
