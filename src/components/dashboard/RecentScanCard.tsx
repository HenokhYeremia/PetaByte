import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Calendar, Clock, FileSearch } from "lucide-react";
import { formatBytes, formatCount, formatDuration } from "@/types/format";
import type { RecentScan } from "@/types";

interface RecentScanCardProps {
  data: RecentScan | null;
  loading?: boolean;
}

export function RecentScanCard({ data, loading }: RecentScanCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Scan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-4 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-4 w-28 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Scan</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-400">No scans have been performed yet.</p>
        </CardContent>
      </Card>
    );
  }

  const date = new Date(data.started_at);
  const dateStr = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Scan</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <Calendar className="h-4 w-4 text-zinc-400" />
          <div>
            <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{dateStr}</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              {data.status === "completed" ? "Completed" : data.status}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Clock className="h-4 w-4 text-zinc-400" />
          <div>
            <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {formatDuration(data.duration_secs)}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">Duration</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <FileSearch className="h-4 w-4 text-zinc-400" />
          <div>
            <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {formatCount(data.files_indexed)} files
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              {formatBytes(data.total_size_bytes)} indexed
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
