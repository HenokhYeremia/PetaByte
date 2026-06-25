import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Trash2, PiggyBank, ShieldCheck, ShieldAlert, ShieldX, FileText } from "lucide-react";
import { formatBytes } from "@/types/format";
import { clsx } from "clsx";
import type { CleanupPreview } from "@/types";

interface CacheCleanupPreviewProps {
  preview: CleanupPreview | null;
  loading?: boolean;
}

const riskIcons = {
  low: ShieldCheck,
  medium: ShieldAlert,
  high: ShieldX,
};

const riskColors = {
  low: "text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30",
  medium: "text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30",
  high: "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30",
};

export function CacheCleanupPreview({ preview, loading }: CacheCleanupPreviewProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cleanup Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!preview || preview.files_to_remove === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cleanup Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <FileText className="h-10 w-10 text-zinc-300 dark:text-zinc-600" />
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">No items selected for cleanup</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">Select cache entries to see a preview</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const RiskIcon = riskIcons[preview.risk_level];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cleanup Preview</CardTitle>
        <span className={clsx("inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-medium", riskColors[preview.risk_level])}>
          <RiskIcon className="h-3 w-3" />
          {preview.risk_level.charAt(0).toUpperCase() + preview.risk_level.slice(1)} Risk
        </span>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <Trash2 className="h-4 w-4" />
              Files to Remove
            </div>
            <div className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">{preview.files_to_remove}</div>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-900/20">
            <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <PiggyBank className="h-4 w-4" />
              Estimated Savings
            </div>
            <div className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">{formatBytes(preview.estimated_savings)}</div>
          </div>
        </div>
        {preview.items.length > 0 && (
          <div className="space-y-1">
            <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">Items</div>
            {preview.items.slice(0, 10).map((item, i) => (
              <div key={i} className="flex items-center gap-2 rounded-md bg-zinc-50 px-2 py-1.5 text-[10px] dark:bg-zinc-800/50">
                {item.safe ? <ShieldCheck className="h-3 w-3 text-emerald-500" /> : <ShieldX className="h-3 w-3 text-red-500" />}
                <span className="flex-1 truncate text-zinc-600 dark:text-zinc-400" title={item.path}>{item.path}</span>
                <span className="shrink-0 text-zinc-500">{formatBytes(item.size)}</span>
                <span className="shrink-0 rounded bg-zinc-200 px-1 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400">{item.category}</span>
              </div>
            ))}
            {preview.items.length > 10 && (
              <p className="text-center text-[10px] text-zinc-400">+{preview.items.length - 10} more items</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
