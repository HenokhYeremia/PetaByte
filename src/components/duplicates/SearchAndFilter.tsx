import { Search, X, SlidersHorizontal } from "lucide-react";
import type { MockFilterState, MockSortConfig } from "@/mocks/duplicates";

interface SearchAndFilterProps {
  filter: MockFilterState;
  onFilterChange: (filter: Partial<MockFilterState>) => void;
  sortConfig: MockSortConfig;
  onSortChange: (field: MockSortConfig["field"]) => void;
  onSortDirectionToggle: () => void;
  loading?: boolean;
}

const sortOptions: { field: MockSortConfig["field"]; label: string }[] = [
  { field: "total_wasted_bytes", label: "Savings" },
  { field: "file_size", label: "Size" },
  { field: "file_count", label: "Count" },
  { field: "extension", label: "Extension" },
];

export function SearchAndFilter({
  filter,
  onFilterChange,
  sortConfig,
  onSortChange,
  onSortDirectionToggle,
  loading,
}: SearchAndFilterProps) {
  if (loading) {
    return (
      <div className="flex animate-pulse items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="h-9 flex-1 rounded-md bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-9 w-28 rounded-md bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-9 w-28 rounded-md bg-zinc-200 dark:bg-zinc-800" />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="pointer-events-none absolute inset-y-0 left-0 ml-3 h-4 w-4 self-center text-zinc-400" />
        <input
          type="text"
          value={filter.folder}
          onChange={(e) => onFilterChange({ folder: e.target.value })}
          placeholder="Search by folder..."
          className="w-full rounded-md border border-zinc-300 bg-white py-2 pl-10 pr-8 text-sm text-zinc-900 placeholder-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500"
        />
        {filter.folder && (
          <button
            type="button"
            onClick={() => onFilterChange({ folder: "" })}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-zinc-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <select
        value={filter.extensions[0] || ""}
        onChange={(e) => onFilterChange({ extensions: e.target.value ? [e.target.value] : [] })}
        className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
      >
        <option value="">All Types</option>
        <option value=".js">JavaScript (.js)</option>
        <option value=".py">Python (.py)</option>
        <option value=".zip">Archive (.zip)</option>
        <option value=".md">Markdown (.md)</option>
        <option value=".mp4">Video (.mp4)</option>
        <option value=".d.ts">TypeScript (.d.ts)</option>
      </select>

      <div className="flex items-center gap-1">
        <SlidersHorizontal className="h-4 w-4 text-zinc-400" />
        <select
          value={sortConfig.field}
          onChange={(e) => onSortChange(e.target.value as MockSortConfig["field"])}
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
        >
          {sortOptions.map((opt) => (
            <option key={opt.field} value={opt.field}>{opt.label}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={onSortDirectionToggle}
          className="rounded-md border border-zinc-300 bg-white px-2.5 py-2 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
          title={sortConfig.direction === "desc" ? "Descending" : "Ascending"}
        >
          {sortConfig.direction === "desc" ? "↓" : "↑"}
        </button>
      </div>
    </div>
  );
}
