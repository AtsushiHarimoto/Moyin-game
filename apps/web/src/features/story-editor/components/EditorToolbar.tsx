interface EditorToolbarProps {
  status: string
  onLoadSample: () => void
  onImportJson: () => void
  onExportLayout: () => void
  onExportSkin: () => void
}

export default function EditorToolbar({
  status,
  onLoadSample,
  onImportJson,
  onExportLayout,
  onExportSkin,
}: EditorToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-700 bg-gray-900/60 p-3 shadow-md">
      <div className="flex gap-2">
        <button
          type="button"
          className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-200 transition-colors hover:bg-gray-700"
          onClick={onLoadSample}
        >
          Load Sample
        </button>
        <button
          type="button"
          className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-200 transition-colors hover:bg-gray-700"
          onClick={onImportJson}
        >
          Import JSON
        </button>
        <button
          type="button"
          className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-200 transition-colors hover:bg-gray-700"
          onClick={onExportLayout}
        >
          Export Layout
        </button>
        <button
          type="button"
          className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-200 transition-colors hover:bg-gray-700"
          onClick={onExportSkin}
        >
          Export Skin
        </button>
      </div>
      <div>
        {status && <span className="text-xs text-gray-400">{status}</span>}
      </div>
    </div>
  )
}
