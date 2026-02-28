import type { IconEntry } from './IconGallery'
import IconThemeEditor from './IconThemeEditor'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ThemeVariant {
  theme: string
  svgPath: string
}

interface AddVariantPayload {
  theme: string
  svgPath: string
  previewUrl: string
}

interface IconDetailsProps {
  icon: IconEntry | null
  themes: string[]
  previewMap: Record<string, string>
  onDelete: () => void
  onAddVariant: (payload: AddVariantPayload) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveVariants(icon: IconEntry): ThemeVariant[] {
  if (!icon.themeVariants) return []
  if (Array.isArray(icon.themeVariants)) return icon.themeVariants
  return Object.entries(icon.themeVariants).map(([theme, svgPath]) => ({
    theme,
    svgPath,
  }))
}

function resolvePreview(path: string, previewMap: Record<string, string>): string {
  return previewMap[path] ?? path
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function IconDetails({
  icon,
  themes,
  previewMap,
  onDelete,
  onAddVariant,
}: IconDetailsProps): React.JSX.Element {
  if (!icon) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900/60 p-4">
        <p className="text-xs text-gray-400">Select an icon to view details.</p>
      </div>
    )
  }

  const variants = resolveVariants(icon)

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-gray-700 bg-gray-900/60 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-200">Icon Details</h3>
        <button
          type="button"
          className="rounded-lg border border-gray-600 bg-gray-800 px-2.5 py-1.5 text-sm text-red-400 transition-colors hover:bg-gray-700"
          onClick={onDelete}
        >
          Delete
        </button>
      </div>

      {/* Preview */}
      <div>
        <img
          src={resolvePreview(icon.svgPath, previewMap)}
          alt={icon.name}
          className="h-16 w-16"
        />
      </div>

      {/* Meta */}
      <div className="grid gap-1 text-xs text-gray-400">
        <div><strong className="text-gray-300">ID:</strong> {icon.id}</div>
        <div><strong className="text-gray-300">Name:</strong> {icon.name}</div>
        <div><strong className="text-gray-300">Category:</strong> {icon.category}</div>
        <div><strong className="text-gray-300">Tags:</strong> {icon.tags.join(', ')}</div>
      </div>

      {/* Theme Variants */}
      <div className="flex flex-col gap-2">
        <h4 className="text-xs font-semibold text-gray-300">Theme Variants</h4>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(90px,1fr))] gap-2">
          {variants.map((variant) => (
            <div
              key={variant.theme}
              className="flex flex-col items-center gap-1 rounded-lg border border-gray-700 bg-gray-800/60 p-1.5 text-xs"
            >
              <img
                src={resolvePreview(variant.svgPath, previewMap)}
                alt={variant.theme}
                className="h-9 w-9"
              />
              <span className="text-gray-400">{variant.theme}</span>
            </div>
          ))}
        </div>
        <IconThemeEditor themes={themes} onAddVariant={onAddVariant} />
      </div>
    </div>
  )
}
