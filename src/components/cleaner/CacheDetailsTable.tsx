import { CheckSquare, Square, Search, AlertTriangle, CheckCircle2, XCircle, Info } from "lucide-react";
import { formatBytes } from "@/types/format";
import { clsx } from "clsx";
import type { MockCacheCategory, MockCacheFilter } from "@/mocks/cache";

interface CacheDetailsTableProps {
  categories: MockCacheCategory[];
  filter: MockCacheFilter;
  onSelectEntry: (entryId: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  loading?: boolean;
}

const safetyIcons = {
  safe: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
};

const safetyColors = {
  safe: "text-emerald-500",
  warning: "text-amber-500",
  error: "text-red-500",
};

const categoryColors: Record<string, string> = {
  browser: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  developer: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  temporary: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  package_manager: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  application: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
};

export function CacheDetailsTable({
  categories,
  filter,
  onSelectEntry,
  onSelectAll,
  loading,
}: CacheDetailsTableProps) {
  const allEntries = categories.flatMap((cat) =>
    cat.entries.map((e) => ({ ...e, category_id: cat.id, category_name: cat.display_name })),
  );

  const filtered = allEntries.filter((e) => {
    if (filter.search && !e.name.toLowerCase().includes(filter.search.toLowerCase()) && !e.path.toLowerCase().includes(filter.search.toLowerCase())) return false;
    if (filter.categoryFilter !== "all" && e.category_id !== filter.categoryFilter) return false;
    if (filter.safetyFilter !== "all" && e.safety_status !== filter.safetyFilter) return false;
    return true;
  });

  const allSelected = filtered.length > 0 && filtered.every((e) => e.selected);
  const someSelected = filtered.some((e) => e.selected);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-9 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        ))}
      </div>
    );
  }

  if (allEntries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <Info className="h-10 w-10 text-zinc-300 dark:text-zinc-600" />
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">No cache entries</p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">Analysis has not been performed yet</p>
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <Search className="h-10 w-10 text-zinc-300 dark:text-zinc-600" />
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">No entries match the current filter</p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">Try adjusting your search or filter criteria</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 rounded-md bg-zinc-50 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:bg-zinc-800/50">
        <button
          type="button"
          onClick={() => onSelectAll(!allSelected)}
          className="flex items-center gap-1 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          {allSelected ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className={clsx("h-3.5 w-3.5", someSelected && "text-emerald-500")} />}
        </button>
        <div className="grid flex-1 grid-cols-12 gap-2">
          <div className="col-span-4">Path</div>
          <div className="col-span-2">Category</div>
          <div className="col-span-2 text-right">Size</div>
          <div className="col-span-2 text-center">Safety</div>
          <div className="col-span-2 text-right">Rule</div>
        </div>
      </div>
      {filtered.map((entry) => {
        const SafetyIcon = safetyIcons[entry.safety_status];
        return (
          <div
            key={entry.id}
            className={clsx(
              "grid grid-cols-12 gap-2 rounded-md px-3 py-2 text-xs transition-colors",
              entry.selected && "bg-emerald-50/50 dark:bg-emerald-900/10",
            )}
          >
            <div className="col-span-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => onSelectEntry(entry.id, !entry.selected)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                {entry.selected ? <CheckSquare className="h-3.5 w-3.5 text-emerald-500" /> : <Square className="h-3.5 w-3.5" />}
              </button>
              <span className="truncate text-zinc-700 dark:text-zinc-300" title={entry.path}>{entry.name}</span>
            </div>
            <div className="col-span-2 truncate">
              <span className={clsx("rounded px-1 py-0.5 text-[9px] font-medium", categoryColors[entry.category_id] || "bg-zinc-100 text-zinc-600")}>
                {entry.category_name}
              </span>
            </div>
            <div className="col-span-2 truncate text-right text-zinc-500">{formatBytes(entry.size)}</div>
            <div className={clsx("col-span-2 flex items-center justify-center gap-1", safetyColors[entry.safety_status])}>
              <SafetyIcon className="h-3 w-3" />
              <span className="text-[10px]">{entry.safety_status}</span>
            </div>
            <div className="col-span-2 truncate text-right text-zinc-400" title={entry.matched_rule}>{entry.matched_rule}</div>
          </div>
        );
      })}
    </div>
  );
}


