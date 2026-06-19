import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { FileSearch, Clock, Gauge, AlertTriangle, FolderTree } from "lucide-react";
import { formatCount, formatDuration } from "@/types/format";
import { clsx } from "clsx";
import type { MockScanProgress } from "@/mocks/scanner";

interface ScanProgressSectionProps {
  progress: MockScanProgress | null;
  loading?: boolean;
}

interface ProgressStatProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function ProgressStat({ icon, label, value }: ProgressStatProps) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="text-zinc-400 dark:text-zinc-500">{icon}</div>
      <div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">{label}</div>
        <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{value}</div>
      </div>
    </div>
  );
}

export function ScanProgressSection({ progress, loading }: ScanProgressSectionProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Scan Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-3 w-full animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="space-y-1">
                  <div className="h-3 w-16 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                  <div className="h-4 w-20 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!progress) {
    return null;
  }

  const isActive = progress.status === "scanning" || progress.status === "paused";
  const progressPct = progress.total_files
    ? Math.min((progress.scanned_files / progress.total_files) * 100, 100)
    : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>Scan Progress</CardTitle>
          {progress.status === "scanning" && <Spinner size="sm" />}
        </div>
        {progressPct !== null && (
          <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {progressPct.toFixed(0)}%
          </span>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div
              className={clsx(
                "h-full rounded-full transition-all duration-300",
                progress.status === "completed" && "bg-emerald-500",
                progress.status === "cancelled" && "bg-zinc-400",
                progress.status === "failed" && "bg-red-500",
                isActive && "bg-emerald-500",
              )}
              style={{
                width: `${progressPct ?? Math.min((progress.scanned_files / 500000) * 100, 95)}%`,
              }}
            />
          </div>
          <div className="mt-1 flex justify-between text-xs text-zinc-400">
            <span>{formatCount(progress.scanned_files)} files</span>
            {progress.total_files && <span>{formatCount(progress.total_files)} total</span>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <ProgressStat
            icon={<FileSearch className="h-4 w-4" />}
            label="Files"
            value={formatCount(progress.scanned_files)}
          />
          <ProgressStat
            icon={<FolderTree className="h-4 w-4" />}
            label="Directories"
            value={formatCount(progress.total_directories)}
          />
          <ProgressStat
            icon={<Gauge className="h-4 w-4" />}
            label="Speed"
            value={`${formatCount(progress.speed_files_per_sec)} files/s`}
          />
          <ProgressStat
            icon={<Clock className="h-4 w-4" />}
            label="Elapsed"
            value={formatDuration(progress.elapsed_secs)}
          />
          {progress.eta_secs !== null && (
            <ProgressStat
              icon={<Clock className="h-4 w-4" />}
              label="ETA"
              value={formatDuration(progress.eta_secs)}
            />
          )}
          {progress.errors > 0 && (
            <ProgressStat
              icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
              label="Errors"
              value={String(progress.errors)}
            />
          )}
        </div>

        {progress.current_path && (
          <div className="rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800/50">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">Current file</div>
            <div className="mt-0.5 truncate font-mono text-xs text-zinc-700 dark:text-zinc-300">
              {progress.current_path}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
