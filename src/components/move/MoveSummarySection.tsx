import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { FileText, HardDrive, PiggyBank } from "lucide-react";
import { formatBytes, formatCount } from "@/types/format";
import { clsx } from "clsx";

interface MoveSummarySectionProps {
  selectedFiles: number;
  totalSize: number;
  estimatedSavings: number;
  loading?: boolean;
}

export function MoveSummarySection({ selectedFiles, totalSize, estimatedSavings, loading }: MoveSummarySectionProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Move Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Move Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-zinc-500 dark:text-zinc-400">Selected Files</div>
                <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{formatCount(selectedFiles)}</div>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                <HardDrive className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-zinc-500 dark:text-zinc-400">Total Size</div>
                <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{formatBytes(totalSize)}</div>
              </div>
            </div>
          </div>
          <div className={clsx(
            "rounded-lg border p-4",
            "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20",
          )}>
            <div className="flex items-center gap-3">
              <div className={clsx(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400",
              )}>
                <PiggyBank className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-zinc-500 dark:text-zinc-400">Estimated Savings</div>
                <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{formatBytes(estimatedSavings)}</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
