import { useRef, useState } from 'react'
import { validateSvgContent } from '../utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AddVariantPayload {
  theme: string
  svgPath: string
  previewUrl: string
}

interface IconThemeEditorProps {
  themes: string[]
  onAddVariant: (payload: AddVariantPayload) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function IconThemeEditor({
  themes,
  onAddVariant,
}: IconThemeEditorProps): React.JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [theme, setTheme] = useState(themes[0] ?? 'default')
  const [error, setError] = useState('')

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    setError('')
    const file = event.target.files?.[0]
    if (!file) return

    const text = await file.text()
    const result = validateSvgContent(text)
    if (!result.valid) {
      setError(result.errors.join(' '))
      return
    }

    onAddVariant({
      theme,
      svgPath: `/icons/${file.name}`,
      previewUrl: URL.createObjectURL(file),
    })

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex flex-col gap-1 text-xs text-gray-400">
        Theme
        <select
          value={theme}
          className="rounded-lg border border-gray-600 bg-gray-900/60 px-2 py-1.5 text-sm text-gray-200"
          onChange={(e) => setTheme(e.target.value)}
        >
          {themes.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-1.5 text-sm text-gray-200 transition-colors hover:bg-gray-700"
        onClick={() => fileInputRef.current?.click()}
      >
        Upload Variant
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".svg"
        className="hidden"
        onChange={handleFileChange}
      />

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
