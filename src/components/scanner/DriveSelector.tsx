import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Disc, HardDrive } from "lucide-react";
import { clsx } from "clsx";
import { formatBytes } from "@/types/format";
import type { MockDrive } from "@/mocks/scanner";

interface DriveSelectorProps {
  drives: MockDrive[];
  selected: string | null;
  onSelect: (mountPoint: string) => void;
  loading?: boolean;
}

function DriveCard({ drive, selected, onSelect }: { drive: MockDrive; selected: boolean; onSelect: () => void }) {
  const usedPct = ((drive.total_bytes - drive.free_bytes) / drive.total_bytes) * 100;
  const barColor = usedPct >= 90 ? "bg-red-500" : usedPct >= 75 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        "flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-all",
        selected
          ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500 dark:border-emerald-400 dark:bg-emerald-900/20"
          : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700",
      )}
    >
      <div className={clsx(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
        selected ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
      )}>
        <HardDrive className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{drive.mount_point}</span>
          {drive.label && (
            <span className="truncate text-xs text-zinc-400 dark:text-zinc-500">({drive.label})</span>
          )}
        </div>
        <div className="mt-1.5 flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
          <span>{formatBytes(drive.free_bytes)} free</span>
          <span>of {formatBytes(drive.total_bytes)}</span>
          <span>{drive.file_system}</span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
          <div className={clsx("h-full rounded-full transition-all", barColor)} style={{ width: `${usedPct}%` }} />
        </div>
      </div>
    </button>
  );
}

export function DriveSelector({ drives, selected, onSelect, loading }: DriveSelectorProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Select Drive</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex animate-pulse items-center gap-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                <div className="h-10 w-10 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
                  <div className="h-3 w-32 rounded bg-zinc-200 dark:bg-zinc-800" />
                  <div className="h-1.5 w-full rounded bg-zinc-200 dark:bg-zinc-800" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!drives || drives.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Select Drive</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Disc className="h-8 w-8 text-zinc-300 dark:text-zinc-600" />
            <p className="text-sm text-zinc-400">No drives detected</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Drive</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {drives.map((drive) => (
            <DriveCard
              key={drive.mount_point}
              drive={drive}
              selected={selected === drive.mount_point}
              onSelect={() => onSelect(drive.mount_point)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
