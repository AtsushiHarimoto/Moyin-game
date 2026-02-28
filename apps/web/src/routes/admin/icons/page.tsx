/** Icon Manager - manage SVG icons, categories, and theme variants. */
import { useState, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/cn'
import {
  Search,
  Upload,
  Download,
  Trash2,
  Plus,
  Palette,
  Tag,
  Image,
  ChevronRight,
} from 'lucide-react'

interface ThemeVariant {
  theme: string
  svgPath: string
}

interface IconEntry {
  id: string
  name: string
  category: string
  tags: string[]
  svgPath: string
  themeVariants?: ThemeVariant[]
}

interface IconRegistry {
  version: string
  themes: string[]
  categories: string[]
  icons: IconEntry[]
}

const DEFAULT_REGISTRY: IconRegistry = {
  version: '1.0.0',
  themes: ['default', 'dark', 'sakura'],
  categories: ['ui', 'game', 'social', 'navigation'],
  icons: [],
}

function normalizeVariants(
  variants: ThemeVariant[] | Record<string, string> | undefined,
): ThemeVariant[] {
  if (!variants) return []
  if (Array.isArray(variants)) return variants
  return Object.entries(variants).map(([theme, svgPath]) => ({
    theme,
    svgPath: String(svgPath),
  }))
}

const panelVariants = {
  hidden: { opacity: 0, x: 12 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.25 } },
  exit: { opacity: 0, x: -12, transition: { duration: 0.15 } },
}

const listItemVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
}

export default function IconManagerPage() {
  const [registry, setRegistry] = useState<IconRegistry>(
    () => JSON.parse(JSON.stringify(DEFAULT_REGISTRY)) as IconRegistry,
  )
  const [previewMap, setPreviewMap] = useState<Record<string, string>>({})
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [selectedId, setSelectedId] = useState('')
  const [previewTheme, setPreviewTheme] = useState(
    () => registry.themes[0] ?? 'default',
  )
  const [showUploader, setShowUploader] = useState(false)

  const uploadInputRef = useRef<HTMLInputElement>(null)
  const variantInputRef = useRef<HTMLInputElement>(null)

  const categories = useMemo(
    () => ['all', ...registry.categories],
    [registry.categories],
  )

  const filteredIcons = useMemo(() => {
    const q = query.trim().toLowerCase()
    return registry.icons.filter((icon) => {
      const categoryMatch =
        activeCategory === 'all' || icon.category === activeCategory
      if (!categoryMatch) return false
      if (!q) return true
      const nameMatch = icon.name.toLowerCase().includes(q)
      const idMatch = icon.id.toLowerCase().includes(q)
      const tagMatch = icon.tags.some((tag) => tag.toLowerCase().includes(q))
      return nameMatch || idMatch || tagMatch
    })
  }, [registry.icons, query, activeCategory])

  const selectedIcon = useMemo<IconEntry | null>(() => {
    if (!selectedId) return null
    return registry.icons.find((icon) => icon.id === selectedId) ?? null
  }, [selectedId, registry.icons])

  const handleAddIcon = useCallback(
    (payload: {
      id: string
      name: string
      category: string
      tags: string[]
      svgPath: string
      previewUrl: string
    }) => {
      setRegistry((prev) => {
        const exists = prev.icons.some((icon) => icon.id === payload.id)
        if (exists) return prev

        const newIcons: IconEntry[] = [
          {
            id: payload.id,
            name: payload.name,
            category: payload.category,
            tags: payload.tags,
            svgPath: payload.svgPath,
          },
          ...prev.icons,
        ]

        const newCategories = prev.categories.includes(payload.category)
          ? prev.categories
          : [...prev.categories, payload.category]

        return { ...prev, icons: newIcons, categories: newCategories }
      })
      setPreviewMap((prev) => ({ ...prev, [payload.svgPath]: payload.previewUrl }))
      setSelectedId(payload.id)
      setShowUploader(false)
    },
    [],
  )

  const handleDeleteIcon = useCallback(() => {
    if (!selectedId) return
    setRegistry((prev) => ({
      ...prev,
      icons: prev.icons.filter((icon) => icon.id !== selectedId),
    }))
    setSelectedId('')
  }, [selectedId])

  const handleAddVariant = useCallback(
    (payload: { theme: string; svgPath: string; previewUrl: string }) => {
      if (!selectedId) return
      setPreviewMap((prev) => ({ ...prev, [payload.svgPath]: payload.previewUrl }))
      setRegistry((prev) => ({
        ...prev,
        icons: prev.icons.map((icon) => {
          if (icon.id !== selectedId) return icon
          const variants = normalizeVariants(icon.themeVariants)
          const existing = variants.find((v) => v.theme === payload.theme)
          if (existing) {
            return {
              ...icon,
              themeVariants: variants.map((v) =>
                v.theme === payload.theme
                  ? { ...v, svgPath: payload.svgPath }
                  : v,
              ),
            }
          }
          return {
            ...icon,
            themeVariants: [
              ...variants,
              { theme: payload.theme, svgPath: payload.svgPath },
            ],
          }
        }),
      }))
    },
    [selectedId],
  )

  const handleExportRegistry = useCallback(() => {
    const cleanRegistry = {
      ...registry,
      icons: registry.icons.map((icon) => ({
        ...icon,
        themeVariants: normalizeVariants(icon.themeVariants).map((v) => ({
          theme: v.theme,
          svgPath: v.svgPath,
        })),
      })),
    }
    const blob = new Blob([JSON.stringify(cleanRegistry, null, 2)], {
      type: 'application/json',
    })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'IconRegistry.json'
    link.click()
    URL.revokeObjectURL(link.href)
  }, [registry])

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      const url = URL.createObjectURL(file)
      const name = file.name.replace(/\.svg$/i, '')
      const id = name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now().toString(36)
      handleAddIcon({
        id,
        name,
        category: activeCategory === 'all' ? 'ui' : activeCategory,
        tags: [name.toLowerCase()],
        svgPath: `/icons/${file.name}`,
        previewUrl: url,
      })
      if (uploadInputRef.current) uploadInputRef.current.value = ''
    },
    [handleAddIcon, activeCategory],
  )

  const handleVariantUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      const url = URL.createObjectURL(file)
      handleAddVariant({
        theme: previewTheme,
        svgPath: `/icons/variants/${file.name}`,
        previewUrl: url,
      })
      if (variantInputRef.current) variantInputRef.current.value = ''
    },
    [handleAddVariant, previewTheme],
  )

  return (
    <div
      className="flex min-h-screen flex-col gap-5 p-6"
      style={{ color: 'var(--ui-text)' }}
    >
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1
            className="m-0 text-2xl font-bold"
            style={{ fontFamily: 'var(--ui-font-special)' }}
          >
            Icon Manager
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--ui-muted)' }}>
            Manage SVG icons and theme variants.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex flex-col gap-1">
            <span
              className="text-xs font-medium"
              style={{ color: 'var(--ui-muted)' }}
            >
              Theme
            </span>
            <select
              value={previewTheme}
              onChange={(e) => setPreviewTheme(e.target.value)}
              className="rounded-lg border px-3 py-1.5 text-sm"
              style={{
                background: 'var(--ui-panel)',
                borderColor: 'var(--ui-border)',
                color: 'var(--ui-text)',
              }}
            >
              {registry.themes.map((theme) => (
                <option key={theme} value={theme}>
                  {theme}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="mt-auto flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all hover:opacity-80"
            style={{
              background: 'var(--ui-panel)',
              borderColor: 'var(--ui-border)',
              color: 'var(--ui-text)',
            }}
            onClick={handleExportRegistry}
          >
            <Download size={14} />
            Export Registry
          </button>
        </div>
      </header>

      {/* Body - 3-column grid */}
      <div className="grid min-h-0 flex-1 grid-cols-[200px_minmax(0,1fr)_280px] gap-4 max-lg:grid-cols-1">
        {/* Left: Category List */}
        <nav
          className="flex flex-col gap-1 overflow-y-auto rounded-xl border p-3"
          style={{
            background: 'var(--ui-panel-glass)',
            borderColor: 'var(--ui-panel-glass-border)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <span
            className="mb-1 px-2 text-xs font-bold uppercase tracking-wider"
            style={{ color: 'var(--ui-muted)' }}
          >
            Categories
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={cn(
                'rounded-lg px-3 py-2 text-left text-sm font-medium capitalize transition-all',
              )}
              style={{
                background:
                  activeCategory === cat
                    ? 'var(--ui-primary-soft)'
                    : 'transparent',
                color:
                  activeCategory === cat
                    ? 'var(--ui-primary)'
                    : 'var(--ui-text)',
              }}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </nav>

        {/* Middle: Search + Upload + Gallery */}
        <div className="flex flex-col gap-4">
          {/* Search */}
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--ui-muted)' }}
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search icons by name, ID, or tag..."
              className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm"
              style={{
                background: 'var(--ui-panel-glass)',
                borderColor: 'var(--ui-border)',
                color: 'var(--ui-text)',
                backdropFilter: 'blur(8px)',
              }}
            />
          </div>

          {/* Upload Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all hover:opacity-80"
              style={{
                background: 'var(--ui-primary-soft)',
                borderColor: 'var(--ui-primary)',
                color: 'var(--ui-primary)',
              }}
              onClick={() => setShowUploader(!showUploader)}
            >
              <Upload size={14} />
              Add Icon
            </button>
            <span className="text-xs" style={{ color: 'var(--ui-muted)' }}>
              {filteredIcons.length} icon{filteredIcons.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Uploader */}
          <AnimatePresence>
            {showUploader && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div
                  className="flex items-center gap-3 rounded-lg border border-dashed p-4"
                  style={{
                    borderColor: 'var(--ui-primary)',
                    background: 'var(--ui-panel-subtle)',
                  }}
                >
                  <Upload
                    size={24}
                    style={{ color: 'var(--ui-primary)' }}
                  />
                  <div className="flex-1">
                    <p
                      className="m-0 text-sm font-medium"
                      style={{ color: 'var(--ui-text)' }}
                    >
                      Upload SVG Icon
                    </p>
                    <p
                      className="m-0 text-xs"
                      style={{ color: 'var(--ui-muted)' }}
                    >
                      Drop an SVG file or click to browse
                    </p>
                  </div>
                  <label
                    className="cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-medium transition-all hover:opacity-80"
                    style={{
                      background: 'var(--ui-panel)',
                      borderColor: 'var(--ui-border)',
                      color: 'var(--ui-text)',
                    }}
                  >
                    Browse
                    <input
                      ref={uploadInputRef}
                      type="file"
                      accept=".svg"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </label>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Icon Gallery */}
          <div
            className="grid flex-1 auto-rows-min grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-3 overflow-y-auto rounded-xl border p-4"
            style={{
              background: 'var(--ui-panel-glass)',
              borderColor: 'var(--ui-panel-glass-border)',
              backdropFilter: 'blur(12px)',
              maxHeight: '60vh',
            }}
          >
            {filteredIcons.length === 0 && (
              <div
                className="col-span-full flex flex-col items-center justify-center py-12"
                style={{ color: 'var(--ui-muted)' }}
              >
                <Image size={32} className="mb-2 opacity-40" />
                <p className="text-sm">No icons found</p>
              </div>
            )}
            {filteredIcons.map((icon) => {
              const preview = previewMap[icon.svgPath]
              const isSelected = icon.id === selectedId
              return (
                <motion.button
                  key={icon.id}
                  type="button"
                  variants={listItemVariants}
                  initial="hidden"
                  animate="visible"
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-lg border p-2 transition-all hover:scale-105',
                  )}
                  style={{
                    background: isSelected
                      ? 'var(--ui-primary-soft)'
                      : 'var(--ui-panel-subtle)',
                    borderColor: isSelected
                      ? 'var(--ui-primary)'
                      : 'var(--ui-border)',
                  }}
                  onClick={() => setSelectedId(icon.id)}
                >
                  <div className="flex h-10 w-10 items-center justify-center">
                    {preview ? (
                      <img
                        src={preview}
                        alt={icon.name}
                        className="h-8 w-8 object-contain"
                      />
                    ) : (
                      <Image
                        size={24}
                        style={{ color: 'var(--ui-muted)', opacity: 0.4 }}
                      />
                    )}
                  </div>
                  <span
                    className="w-full truncate text-center text-[10px]"
                    style={{ color: 'var(--ui-text)' }}
                  >
                    {icon.name}
                  </span>
                </motion.button>
              )
            })}
          </div>
        </div>

        {/* Right: Icon Details */}
        <AnimatePresence mode="wait">
          {selectedIcon ? (
            <motion.aside
              key={selectedIcon.id}
              variants={panelVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex flex-col gap-4 overflow-y-auto rounded-xl border p-4"
              style={{
                background: 'var(--ui-panel-glass)',
                borderColor: 'var(--ui-panel-glass-border)',
                backdropFilter: 'blur(12px)',
              }}
            >
              {/* Preview */}
              <div
                className="flex h-28 items-center justify-center rounded-lg border"
                style={{
                  background: 'var(--ui-panel-subtle)',
                  borderColor: 'var(--ui-border)',
                }}
              >
                {previewMap[selectedIcon.svgPath] ? (
                  <img
                    src={previewMap[selectedIcon.svgPath]}
                    alt={selectedIcon.name}
                    className="max-h-20 max-w-20 object-contain"
                  />
                ) : (
                  <Image size={40} style={{ color: 'var(--ui-muted)', opacity: 0.3 }} />
                )}
              </div>

              {/* Info */}
              <div className="flex flex-col gap-2">
                <h3
                  className="m-0 text-sm font-semibold"
                  style={{ color: 'var(--ui-text)' }}
                >
                  {selectedIcon.name}
                </h3>
                <DetailRow label="ID" value={selectedIcon.id} />
                <DetailRow label="Category" value={selectedIcon.category} />
                <DetailRow label="SVG Path" value={selectedIcon.svgPath} />

                {selectedIcon.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <Tag
                      size={12}
                      style={{ color: 'var(--ui-muted)' }}
                      className="mt-0.5"
                    />
                    {selectedIcon.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full px-2 py-0.5 text-[10px]"
                        style={{
                          background: 'var(--ui-primary-soft)',
                          color: 'var(--ui-primary)',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Theme Variants */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: 'var(--ui-muted)' }}
                  >
                    Theme Variants
                  </span>
                  <label
                    className="flex cursor-pointer items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-medium transition-all hover:opacity-80"
                    style={{
                      background: 'var(--ui-panel)',
                      borderColor: 'var(--ui-border)',
                      color: 'var(--ui-text)',
                    }}
                  >
                    <Plus size={10} />
                    Add
                    <input
                      ref={variantInputRef}
                      type="file"
                      accept=".svg"
                      className="hidden"
                      onChange={handleVariantUpload}
                    />
                  </label>
                </div>
                <div className="flex flex-col gap-1">
                  {normalizeVariants(selectedIcon.themeVariants).map((v) => (
                    <div
                      key={v.theme}
                      className="flex items-center gap-2 rounded-md border px-2 py-1.5"
                      style={{
                        background: 'var(--ui-panel-subtle)',
                        borderColor: 'var(--ui-border)',
                      }}
                    >
                      <Palette
                        size={12}
                        style={{ color: 'var(--ui-primary)' }}
                      />
                      <span
                        className="flex-1 text-xs"
                        style={{ color: 'var(--ui-text)' }}
                      >
                        {v.theme}
                      </span>
                      <ChevronRight
                        size={12}
                        style={{ color: 'var(--ui-muted)' }}
                      />
                    </div>
                  ))}
                  {normalizeVariants(selectedIcon.themeVariants).length === 0 && (
                    <p
                      className="text-center text-xs italic"
                      style={{ color: 'var(--ui-muted)' }}
                    >
                      No variants
                    </p>
                  )}
                </div>
              </div>

              {/* Delete */}
              <button
                type="button"
                className="mt-auto flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all hover:opacity-80"
                style={{
                  background:
                    'color-mix(in srgb, var(--ui-danger) 10%, transparent)',
                  borderColor:
                    'color-mix(in srgb, var(--ui-danger) 30%, transparent)',
                  color: 'var(--ui-danger)',
                }}
                onClick={handleDeleteIcon}
              >
                <Trash2 size={14} />
                Delete Icon
              </button>
            </motion.aside>
          ) : (
            <motion.aside
              key="empty"
              variants={panelVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex flex-col items-center justify-center gap-2 rounded-xl border p-6"
              style={{
                background: 'var(--ui-panel-glass)',
                borderColor: 'var(--ui-panel-glass-border)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <Image size={32} style={{ color: 'var(--ui-muted)', opacity: 0.3 }} />
              <p
                className="m-0 text-center text-xs"
                style={{ color: 'var(--ui-muted)' }}
              >
                Select an icon to view details
              </p>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span
        className="min-w-[60px] text-[10px] font-medium uppercase"
        style={{ color: 'var(--ui-muted)' }}
      >
        {label}
      </span>
      <span
        className="break-all text-xs"
        style={{ color: 'var(--ui-text)' }}
      >
        {value}
      </span>
    </div>
  )
}
