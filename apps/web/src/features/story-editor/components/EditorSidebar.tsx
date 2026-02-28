interface Tab {
  key: string
  label: string
}

interface EditorSidebarProps {
  tabs: Tab[]
  active: string
  onSelect: (key: string) => void
}

export default function EditorSidebar({ tabs, active, onSelect }: EditorSidebarProps) {
  return (
    <nav className="flex min-w-[180px] flex-col gap-2 rounded-lg border border-gray-700 bg-gray-900/60 p-3">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
            tab.key === active
              ? 'border-blue-500 bg-blue-500/10 text-white'
              : 'border-transparent bg-transparent text-gray-300 hover:bg-gray-800'
          }`}
          onClick={() => onSelect(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
