import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Globe, Code2, FileClock, Package, AppWindow, ShieldCheck, ShieldAlert, ShieldX, HardDrive } from "lucide-react";
import { formatBytes } from "@/types/format";
import { clsx } from "clsx";
import type { CacheCategory } from "@/types";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Globe,
  Code2,
  FileClock,
  Package,
  AppWindow,
};

const riskColors = {
  safe: "text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30",
  moderate: "text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30",
  risky: "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30",
};

const riskIcons = {
  safe: ShieldCheck,
  moderate: ShieldAlert,
  risky: ShieldX,
};

interface CacheCategoryPanelProps {
  categories: CacheCategory[];
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
  loading?: boolean;
}

export function CacheCategoryPanel({
  categories,
  selectedCategoryId,
  onSelectCategory,
  loading,
}: CacheCategoryPanelProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cache Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!categories || categories.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cache Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <HardDrive className="h-10 w-10 text-zinc-300 dark:text-zinc-600" />
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">No cache categories found</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">Run an analysis to detect cache files</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cache Categories</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {categories.map((cat) => {
          const Icon = iconMap[cat.icon] || HardDrive;
          const RiskIcon = riskIcons[cat.risk_level];
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(selectedCategoryId === cat.id ? null : cat.id)}
              className={clsx(
                "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                selectedCategoryId === cat.id
                  ? "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20"
                  : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700",
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{cat.display_name}</span>
                  <span className={clsx("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-medium", riskColors[cat.risk_level])}>
                    <RiskIcon className="h-2.5 w-2.5" />
                    {cat.risk_level}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-3 text-[10px] text-zinc-500 dark:text-zinc-400">
                  <span>{cat.file_count} files</span>
                  <span>{formatBytes(cat.total_size)}</span>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{formatBytes(cat.total_size)}</div>
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
