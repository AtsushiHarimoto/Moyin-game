// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConfigExporterProps {
  layoutKey: string
  skinKey: string
  onExportLayout: () => void
  onExportSkin: () => void
  onCopyLayout: () => void
  onCopySkin: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ConfigExporter({
  layoutKey,
  skinKey,
  onExportLayout,
  onExportSkin,
  onCopyLayout,
  onCopySkin,
}: ConfigExporterProps): React.JSX.Element {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-gray-700 bg-gray-900/60 p-3">
      <div className="flex flex-col gap-1">
        <h2 className="m-0 text-sm font-semibold text-gray-200">Export</h2>
        <p className="m-0 text-xs text-gray-400">Download or copy JSON snapshots.</p>
      </div>

      {/* Layout export */}
      <div className="flex flex-col gap-2 rounded border border-gray-700 bg-gray-800/60 p-2">
        <div>
          <div className="text-xs text-gray-400">Layout</div>
          <div className="text-sm text-gray-200">{layoutKey || 'layout'}</div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded border border-gray-600 bg-gray-900/60 px-2.5 py-1.5 text-sm text-gray-200 transition-colors hover:bg-gray-800"
            onClick={onExportLayout}
          >
            Download
          </button>
          <button
            type="button"
            className="rounded border border-gray-600 bg-gray-900/60 px-2.5 py-1.5 text-sm text-gray-200 transition-colors hover:bg-gray-800"
            onClick={onCopyLayout}
          >
            Copy JSON
          </button>
        </div>
      </div>

      {/* Skin export */}
      <div className="flex flex-col gap-2 rounded border border-gray-700 bg-gray-800/60 p-2">
        <div>
          <div className="text-xs text-gray-400">Skin</div>
          <div className="text-sm text-gray-200">{skinKey || 'skin'}</div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded border border-gray-600 bg-gray-900/60 px-2.5 py-1.5 text-sm text-gray-200 transition-colors hover:bg-gray-800"
            onClick={onExportSkin}
          >
            Download
          </button>
          <button
            type="button"
            className="rounded border border-gray-600 bg-gray-900/60 px-2.5 py-1.5 text-sm text-gray-200 transition-colors hover:bg-gray-800"
            onClick={onCopySkin}
          >
            Copy JSON
          </button>
        </div>
      </div>
    </section>
  )
}
