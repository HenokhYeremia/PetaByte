import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Clock, HardDrive, FileText, FolderTree, History, Ban, CheckCircle2, XCircle } from "lucide-react";
import { formatBytes, formatCount, formatDuration } from "@/types/format";
import { clsx } from "clsx";
import type { HistoryItem } from "@/types";

interface RecentScanHistoryProps {
  history: HistoryItem[];
  loading?: boolean;
  onSelect?: (id: string) => void;
  selectedId?: string | null;
}

const statusIcons: Record<string, typeof CheckCircle2> = {
  completed: CheckCircle2,
  cancelled: Ban,
  failed: XCircle,
};

const statusColors: Record<string, string> = {
  completed: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20",
  cancelled: "text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800",
  failed: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20",
};

export function RecentScanHistory({ history, loading, onSelect, selectedId }: RecentScanHistoryProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Scan History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex animate-pulse items-center gap-4 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                <Skeleton className="h-8 w-8 rounded" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!history || history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Scan History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <History className="h-10 w-10 text-zinc-300 dark:text-zinc-600" />
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">No scan history</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              Completed scans will appear here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scan History</CardTitle>
        <span className="text-xs text-zinc-400">{history.length} scans</span>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {history.map((item) => {
            const StatusIcon = statusIcons[item.status];
            const date = new Date(item.started_at);
            const dateStr = date.toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect?.(item.id)}
                className={clsx(
                  "flex w-full items-center gap-4 rounded-lg border p-3 text-left transition-all",
                  selectedId === item.id
                    ? "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20"
                    : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/50",
                )}
              >
                <div className={clsx(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                  statusColors[item.status],
                )}>
                  <StatusIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {item.path}
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="inline-flex items-center gap-1">
                      <FileText className="h-3 w-3" /> {formatCount(item.total_files)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <FolderTree className="h-3 w-3" /> {formatCount(item.total_directories)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <HardDrive className="h-3 w-3" /> {formatBytes(item.total_size)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {formatDuration(item.duration_secs)}
                    </span>
                  </div>
                </div>
                <div className="hidden shrink-0 text-right sm:block">
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">{dateStr}</div>
                  <span className={clsx(
                    "mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                    statusColors[item.status],
                  )}>
                    <StatusIcon className="h-2.5 w-2.5" />
                    {item.status}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
