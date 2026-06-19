import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { formatBytes } from "@/types/format";
import type { MockStorageOverview } from "@/mocks/dashboard";

interface StorageOverviewCardProps {
  data: MockStorageOverview | null;
  loading?: boolean;
}

function StorageBar({ used, free, total }: { used: number; free: number; total: number }) {
  const usedPct = (used / total) * 100;
  const freePct = (free / total) * 100;

  const barColor =
    usedPct >= 90
      ? "bg-red-500"
      : usedPct >= 75
        ? "bg-amber-500"
        : "bg-emerald-500";

  return (
    <div className="space-y-1">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${usedPct}%` }}
        />
        {freePct > 5 && (
          <div
            className="h-full rounded-full bg-zinc-300 dark:bg-zinc-700"
            style={{ width: `${freePct}%` }}
          />
        )}
      </div>
      <div className="flex justify-between text-xs text-zinc-400 dark:text-zinc-500">
        <span>{usedPct.toFixed(0)}% used</span>
        <span>{freePct.toFixed(0)}% free</span>
      </div>
    </div>
  );
}

export function StorageOverviewCard({ data, loading }: StorageOverviewCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Storage Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-8 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-3 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-8 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Storage Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-400">Run a scan to see storage overview.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Storage Overview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">Total</div>
            <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {formatBytes(data.total_bytes)}
            </div>
          </div>
          <div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">Used</div>
            <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {formatBytes(data.used_bytes)}
            </div>
          </div>
          <div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">Free</div>
            <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {formatBytes(data.free_bytes)}
            </div>
          </div>
        </div>
        <StorageBar used={data.used_bytes} free={data.free_bytes} total={data.total_bytes} />
      </CardContent>
    </Card>
  );
}
