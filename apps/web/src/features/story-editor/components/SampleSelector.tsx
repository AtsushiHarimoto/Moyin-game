import { useState, useEffect } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SampleOption {
  key: string
  label: string
}

interface SampleSelectorProps {
  layoutOptions: SampleOption[]
  skinOptions: SampleOption[]
  layoutKey: string
  skinKey: string
  onSelect: (payload: { layoutKey: string; skinKey: string }) => void
  onLayoutKeyChange?: (key: string) => void
  onSkinKeyChange?: (key: string) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SampleSelector({
  layoutOptions,
  skinOptions,
  layoutKey,
  skinKey,
  onSelect,
  onLayoutKeyChange,
  onSkinKeyChange,
}: SampleSelectorProps): React.JSX.Element {
  const [selectedLayout, setSelectedLayout] = useState(layoutKey)
  const [selectedSkin, setSelectedSkin] = useState(skinKey)

  useEffect(() => {
    if (layoutKey !== selectedLayout) setSelectedLayout(layoutKey)
  }, [layoutKey, selectedLayout])

  useEffect(() => {
    if (skinKey !== selectedSkin) setSelectedSkin(skinKey)
  }, [skinKey, selectedSkin])

  function handleLayoutChange(value: string): void {
    setSelectedLayout(value)
    onLayoutKeyChange?.(value)
  }

  function handleSkinChange(value: string): void {
    setSelectedSkin(value)
    onSkinKeyChange?.(value)
  }

  function handleApply(): void {
    onSelect({ layoutKey: selectedLayout, skinKey: selectedSkin })
  }

  return (
    <section className="flex flex-col gap-2 rounded-lg border border-gray-700 bg-gray-900/60 p-3">
      <div className="flex flex-col gap-1">
        <h2 className="m-0 text-sm font-semibold text-gray-200">Samples</h2>
        <p className="m-0 text-xs text-gray-400">Pick a layout + skin pairing.</p>
      </div>

      <label className="text-xs text-gray-400" htmlFor="sample-layout">
        Layout
      </label>
      <select
        id="sample-layout"
        value={selectedLayout}
        data-testid="layout-select"
        className="rounded border border-gray-600 bg-gray-800/60 px-2 py-1.5 text-sm text-gray-200"
        onChange={(e) => handleLayoutChange(e.target.value)}
      >
        {layoutOptions.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </select>

      <label className="text-xs text-gray-400" htmlFor="sample-skin">
        Skin
      </label>
      <select
        id="sample-skin"
        value={selectedSkin}
        data-testid="skin-select"
        className="rounded border border-gray-600 bg-gray-800/60 px-2 py-1.5 text-sm text-gray-200"
        onChange={(e) => handleSkinChange(e.target.value)}
      >
        {skinOptions.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </select>

      <button
        type="button"
        data-testid="apply-sample"
        className="mt-1 rounded-lg border border-gray-600 bg-blue-500/10 px-2.5 py-2 text-sm text-gray-200 transition-colors hover:bg-blue-500/20"
        onClick={handleApply}
      >
        Apply Sample
      </button>
    </section>
  )
}
