import { useRef, useState } from 'react'
import { validateSvgContent } from '../utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AddIconPayload {
  id: string
  name: string
  category: string
  tags: string[]
  svgPath: string
  previewUrl: string
}

interface IconUploaderProps {
  onAdd: (payload: AddIconPayload) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function IconUploader({ onAdd }: IconUploaderProps): React.JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('ui')
  const [tags, setTags] = useState('')
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

    const baseName = file.name.replace('.svg', '')
    const id = baseName.toLowerCase().replace(/[^a-z0-9-]+/g, '-')
    const iconName = name || baseName

    onAdd({
      id,
      name: iconName,
      category: category || 'ui',
      tags: tags.split(',').map((item) => item.trim()).filter(Boolean),
      svgPath: `/icons/${file.name}`,
      previewUrl: URL.createObjectURL(file),
    })

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setName('')
    setTags('')
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-gray-700 bg-gray-800/60 p-4">
      <h3 className="text-sm font-semibold text-gray-200">Upload SVG</h3>

      <input
        ref={fileInputRef}
        type="file"
        accept=".svg"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="grid gap-2">
        <label className="flex flex-col gap-1 text-xs text-gray-400">
          Name
          <input
            type="text"
            value={name}
            placeholder="Icon name"
            className="rounded-lg border border-gray-600 bg-gray-900/60 px-2.5 py-1.5 text-sm text-gray-200"
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-400">
          Category
          <input
            type="text"
            value={category}
            placeholder="ui"
            className="rounded-lg border border-gray-600 bg-gray-900/60 px-2.5 py-1.5 text-sm text-gray-200"
            onChange={(e) => setCategory(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-400">
          Tags (comma)
          <input
            type="text"
            value={tags}
            placeholder="menu, play"
            className="rounded-lg border border-gray-600 bg-gray-900/60 px-2.5 py-1.5 text-sm text-gray-200"
            onChange={(e) => setTags(e.target.value)}
          />
        </label>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-200 transition-colors hover:bg-gray-700"
          onClick={() => fileInputRef.current?.click()}
        >
          Select SVG
        </button>
        <span className="text-xs text-gray-400">
          Files are not persisted; export registry to save.
        </span>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
