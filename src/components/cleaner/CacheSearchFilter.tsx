import { Search, X } from "lucide-react";
import type { MockCacheFilter, MockSafetyStatus } from "@/mocks/cache";

interface CacheSearchFilterProps {
  filter: MockCacheFilter;
  categories: { id: string; display_name: string }[];
  onFilterChange: (partial: Partial<MockCacheFilter>) => void;
}

export function CacheSearchFilter({ filter, categories, onFilterChange }: CacheSearchFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[160px]">
        <Search className="pointer-events-none absolute inset-y-0 left-0 ml-2.5 h-3.5 w-3.5 self-center text-zinc-400" />
        <input
          type="text"
          value={filter.search}
          onChange={(e) => onFilterChange({ search: e.target.value })}
          placeholder="Search cache files..."
          className="w-full rounded-md border border-zinc-300 bg-white py-1.5 pl-8 pr-7 text-xs text-zinc-900 placeholder-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
        {filter.search && (
          <button
            type="button"
            onClick={() => onFilterChange({ search: "" })}
            className="absolute inset-y-0 right-0 flex items-center pr-2 text-zinc-400"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      <select
        value={filter.categoryFilter}
        onChange={(e) => onFilterChange({ categoryFilter: e.target.value })}
        className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs text-zinc-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
      >
        <option value="all">All Categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.display_name}</option>
        ))}
      </select>
      <select
        value={filter.safetyFilter}
        onChange={(e) => onFilterChange({ safetyFilter: e.target.value as MockSafetyStatus | "all" })}
        className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs text-zinc-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
      >
        <option value="all">All Safety</option>
        <option value="safe">Safe</option>
        <option value="warning">Warning</option>
        <option value="error">Error</option>
      </select>
    </div>
  );
}
