// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SearchBar({
  value,
  onChange,
}: SearchBarProps): React.JSX.Element {
  return (
    <label className="flex flex-col gap-1.5 text-xs text-gray-400">
      Search
      <input
        type="text"
        value={value}
        placeholder="Search by name, id, or tag"
        className="rounded-lg border border-gray-600 bg-gray-900/60 px-2.5 py-2 text-sm text-gray-200 outline-none transition-all duration-200 focus:border-blue-500 focus:shadow-[0_0_0_2px_rgba(59,130,246,0.2)]"
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}
