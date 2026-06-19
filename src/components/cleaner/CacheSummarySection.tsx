import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Trash2, PiggyBank, FolderTree, Clock } from "lucide-react";
import { formatBytes, formatCount } from "@/types/format";

interface CacheSummarySectionProps {
  totalCacheSize: number;
  potentialSavings: number;
  categoryCount: number;
  lastAnalysis: string | null;
  loading?: boolean;
}

export function CacheSummarySection({
  totalCacheSize,
  potentialSavings,
  categoryCount,
  lastAnalysis,
  loading,
}: CacheSummarySectionProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cache Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse space-y-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                <div className="h-3 w-16 rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-6 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const formattedDate = lastAnalysis
    ? new Date(lastAnalysis).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cache Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-4">
          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-zinc-500 dark:text-zinc-400">Total Cache</div>
                <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{formatBytes(totalCacheSize)}</div>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-900/20">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
                <PiggyBank className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-zinc-500 dark:text-zinc-400">Potential Savings</div>
                <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{formatBytes(potentialSavings)}</div>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                <FolderTree className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-zinc-500 dark:text-zinc-400">Categories</div>
                <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{formatCount(categoryCount)}</div>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                <Clock className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-zinc-500 dark:text-zinc-400">Last Analysis</div>
                <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{formattedDate ?? "Never"}</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
