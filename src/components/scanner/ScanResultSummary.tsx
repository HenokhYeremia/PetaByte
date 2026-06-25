import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { FileText, FolderTree, HardDrive, Clock, AlertTriangle, CheckCircle2, XCircle, Ban } from "lucide-react";
import { formatBytes, formatCount, formatDuration } from "@/types/format";
import { clsx } from "clsx";
import type { ScanResult } from "@/types";

interface ScanResultSummaryProps {
  result: ScanResult | null;
  loading?: boolean;
}

interface ResultStatProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}

function ResultStat({ icon, label, value, highlight }: ResultStatProps) {
  return (
    <div className={clsx(
      "rounded-lg border p-3",
      highlight
        ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20"
        : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900",
    )}>
      <div className="flex items-center gap-2">
        <div className={clsx("shrink-0", highlight ? "text-emerald-500" : "text-zinc-400")}>{icon}</div>
        <div className="min-w-0">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">{label}</div>
          <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{value}</div>
        </div>
      </div>
    </div>
  );
}

export function ScanResultSummary({ result, loading }: ScanResultSummaryProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Scan Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="animate-pulse space-y-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                <div className="h-3 w-12 rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-5 w-16 rounded bg-zinc-200 dark:bg-zinc-800" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!result) {
    return null;
  }

  const statusConfig: Record<string, { icon: typeof CheckCircle2; label: string; color: string; bg: string }> = {
    completed: { icon: CheckCircle2, label: "Completed", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800" },
    cancelled: { icon: Ban, label: "Cancelled", color: "text-zinc-600 dark:text-zinc-400", bg: "bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700" },
    failed: { icon: XCircle, label: "Failed", color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800" },
  };
  const sc = statusConfig[result.status];
  const StatusIcon = sc.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scan Results</CardTitle>
        <span className={clsx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", sc.bg, sc.color)}>
          <StatusIcon className="h-3.5 w-3.5" />
          {sc.label}
        </span>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <ResultStat
            icon={<FileText className="h-4 w-4" />}
            label="Total Files"
            value={formatCount(result.total_files)}
            highlight
          />
          <ResultStat
            icon={<FolderTree className="h-4 w-4" />}
            label="Directories"
            value={formatCount(result.total_directories)}
          />
          <ResultStat
            icon={<HardDrive className="h-4 w-4" />}
            label="Total Size"
            value={formatBytes(result.total_size)}
          />
          <ResultStat
            icon={<Clock className="h-4 w-4" />}
            label="Duration"
            value={formatDuration(result.duration_secs)}
          />
          {result.errors > 0 && (
            <ResultStat
              icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
              label="Errors"
              value={String(result.errors)}
            />
          )}
        </div>
        <div className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
          Path: <span className="font-mono text-zinc-500 dark:text-zinc-400">{result.path}</span>
        </div>
      </CardContent>
    </Card>
  );
}
