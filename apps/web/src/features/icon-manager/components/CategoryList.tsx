import { cn } from '../../../lib/cn'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CategoryListProps {
  categories: string[]
  active: string
  onSelect: (category: string) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CategoryList({
  categories,
  active,
  onSelect,
}: CategoryListProps): React.JSX.Element {
  return (
    <aside className="flex min-w-[180px] flex-col gap-2 rounded-lg border border-gray-700 bg-gray-900/60 p-4">
      <h3 className="text-sm font-semibold text-gray-400">Categories</h3>
      {categories.map((item) => (
        <button
          key={item}
          type="button"
          className={cn(
            'rounded-lg border px-2.5 py-2 text-left text-sm transition-colors',
            item === active
              ? 'border-blue-500 bg-blue-500/10 text-white'
              : 'border-transparent bg-transparent text-gray-300 hover:bg-gray-800',
          )}
          onClick={() => onSelect(item)}
        >
          {item}
        </button>
      ))}
    </aside>
  )
}
