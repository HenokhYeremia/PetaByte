import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Undo2, FileText, HardDrive, Clock, BookOpen, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { formatBytes } from "@/types/format";
import { clsx } from "clsx";
import type { MockUndoJournalEntry } from "@/mocks/move";

interface UndoCenterPreviewProps {
  entries: MockUndoJournalEntry[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  loading?: boolean;
}

const statusIcons = {
  available: { icon: CheckCircle2, color: "text-emerald-500", label: "Available" },
  used: { icon: XCircle, color: "text-zinc-400", label: "Used" },
  expired: { icon: AlertTriangle, color: "text-red-500", label: "Expired" },
};

export function UndoCenterPreview({ entries, selectedId, onSelect, loading }: UndoCenterPreviewProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Undo Center</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Undo Center</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Undo2 className="h-10 w-10 text-zinc-300 dark:text-zinc-600" />
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">No recent operations</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">Completed moves will appear here for undo</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const availableCount = entries.filter((e) => e.status === "available").length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>Undo Center</CardTitle>
          {availableCount > 0 && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              {availableCount} available
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {entries.map((entry) => {
          const s = statusIcons[entry.status];
          const Icon = s.icon;
          const date = new Date(entry.started_at);
          const isSelected = selectedId === entry.id;

          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => onSelect(isSelected ? null : entry.id)}
              className={clsx(
                "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                isSelected
                  ? "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20"
                  : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700",
              )}
            >
              <Icon className={clsx("mt-0.5 h-4 w-4 shrink-0", s.color)} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {entry.source_root} → {entry.dest_root}
                  </span>
                  <span className={clsx(
                    "shrink-0 rounded px-1.5 py-0.5 text-[9px] font-medium",
                    entry.status === "available" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                    entry.status === "used" && "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
                    entry.status === "expired" && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                  )}>
                    {s.label}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-[10px] text-zinc-500 dark:text-zinc-400">
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {entry.operation_count} files
                  </span>
                  <span className="flex items-center gap-1">
                    <HardDrive className="h-3 w-3" />
                    {formatBytes(entry.total_bytes)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                </div>
                {isSelected && (
                  <div className="mt-2 rounded-md bg-zinc-50 p-2 text-[10px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      Journal: {entry.journal_path}
                    </span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
