import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Copy, FolderKanban, HardDrive, Clock, FileWarning } from "lucide-react";
import { formatBytes, formatCount } from "@/types/format";
import { clsx } from "clsx";
import type { MockDuplicateSummary } from "@/mocks/duplicates";

interface DuplicateSummarySectionProps {
  summary: MockDuplicateSummary | null;
  loading?: boolean;
}

interface SummaryStatProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}

function SummaryStat({ icon, label, value, highlight }: SummaryStatProps) {
  return (
    <div className={clsx(
      "rounded-lg border p-4",
      highlight
        ? "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20"
        : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900",
    )}>
      <div className="flex items-center gap-3">
        <div className={clsx(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
          highlight
            ? "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400"
            : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
        )}>
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">{label}</div>
          <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{value}</div>
        </div>
      </div>
    </div>
  );
}

export function DuplicateSummarySection({ summary, loading }: DuplicateSummarySectionProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Duplicate Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse space-y-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                <div className="h-3 w-16 rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-6 w-20 rounded bg-zinc-200 dark:bg-zinc-800" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Duplicate Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <FileWarning className="h-10 w-10 text-zinc-300 dark:text-zinc-600" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No duplicate data available</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">Run a scan and duplicate detection to see results</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const date = new Date(summary.scanned_at);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Duplicate Summary</CardTitle>
        <span className="flex items-center gap-1.5 text-xs text-zinc-400">
          <Clock className="h-3.5 w-3.5" />
          {date.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </span>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <SummaryStat
            icon={<Copy className="h-5 w-5" />}
            label="Duplicate Groups"
            value={formatCount(summary.total_groups)}
          />
          <SummaryStat
            icon={<FolderKanban className="h-5 w-5" />}
            label="Duplicate Files"
            value={formatCount(summary.total_duplicate_files)}
          />
          <SummaryStat
            icon={<HardDrive className="h-5 w-5" />}
            label="Wasted Space"
            value={formatBytes(summary.total_wasted_bytes)}
            highlight
          />
          <SummaryStat
            icon={<FileWarning className="h-5 w-5" />}
            label="Files Scanned"
            value={formatCount(summary.total_files_scan)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
