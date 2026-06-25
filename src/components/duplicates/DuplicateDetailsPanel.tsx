import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { HardDrive, Calendar, Hash, Copy, CheckCircle2, AlertTriangle } from "lucide-react";
import { formatBytes } from "@/types/format";
import { clsx } from "clsx";
import type { DuplicateGroup } from "@/types";
import { DuplicateActions } from "@/components/duplicates/DuplicateActions";

interface DuplicateDetailsPanelProps {
  group: DuplicateGroup | null;
  selectedFileIds: Set<string>;
  onToggleFile: (groupId: string, fileId: string) => void;
  onSelectAll: (select: boolean) => void;
  onPreviewMove?: () => void;
  onPreviewDelete?: () => void;
  onSmartMove?: () => void;
  onExportReport?: () => void;
  loading?: boolean;
}

export function DuplicateDetailsPanel({
  group,
  selectedFileIds,
  onToggleFile,
  onSelectAll,
  onPreviewMove,
  onPreviewDelete,
  onSmartMove,
  onExportReport,
  loading,
}: DuplicateDetailsPanelProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>File Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 w-40 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!group) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>File Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Copy className="h-12 w-12 text-zinc-300 dark:text-zinc-600" />
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">No group selected</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              Click on a duplicate group to view file details
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const allSelected = group.files.every((f) => selectedFileIds.has(f.id));
  const selectedInGroup = group.files.filter((f) => selectedFileIds.has(f.id));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>File Details</CardTitle>
          <span className="text-xs text-zinc-400">{group.file_count} files</span>
        </div>
        <button
          type="button"
          onClick={() => onSelectAll(!allSelected)}
          className={clsx(
            "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            allSelected
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700",
          )}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          {allSelected ? "Deselect All" : "Select All"}
        </button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800/50">
            <HardDrive className="h-4 w-4 text-zinc-400" />
            <div>
              <div className="text-[10px] text-zinc-500 dark:text-zinc-400">File Size</div>
              <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{formatBytes(group.file_size)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800/50">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <div>
              <div className="text-[10px] text-zinc-500 dark:text-zinc-400">Wasted Space</div>
              <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{formatBytes(group.total_wasted_bytes)}</div>
            </div>
          </div>
        </div>

        <DuplicateActions
          selectedCount={selectedInGroup.length}
          selectedSavings={selectedInGroup.length > 1 ? (selectedInGroup.length - 1) * group.file_size : 0}
          onPreviewMove={onPreviewMove}
          onPreviewDelete={onPreviewDelete}
          onSmartMove={onSmartMove}
          onExportReport={onExportReport}
        />

        <div className="space-y-1">
          <div className="grid grid-cols-12 gap-2 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-zinc-400">
            <div className="col-span-5">Name / Path</div>
            <div className="col-span-2">Size</div>
            <div className="col-span-2">Modified</div>
            <div className="col-span-3">Hash</div>
          </div>
          {group.files.map((file) => {
            const isSelected = selectedFileIds.has(file.id);
            const date = new Date(file.modified_at);
            return (
              <div
                key={file.id}
                className={clsx(
                  "grid grid-cols-12 gap-2 rounded-md px-2 py-2 text-xs transition-colors",
                  isSelected && "bg-emerald-50 dark:bg-emerald-900/10",
                )}
              >
                <div className="col-span-5 flex items-start gap-2">
                  <div
                    role="checkbox"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onClick={() => onToggleFile(group.id, file.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onToggleFile(group.id, file.id);
                      }
                    }}
                    className={clsx(
                      "mt-0.5 flex h-3.5 w-3.5 shrink-0 cursor-pointer items-center justify-center rounded border transition-colors",
                      isSelected
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-800",
                    )}
                  >
                    {isSelected && <CheckCircle2 className="h-2.5 w-2.5" />}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-medium text-zinc-900 dark:text-zinc-100">{file.file_name}</div>
                    <div className="mt-0.5 truncate text-zinc-400 dark:text-zinc-500">{file.file_path}</div>
                  </div>
                </div>
                <div className="col-span-2 flex items-center text-zinc-500">{formatBytes(file.file_size)}</div>
                <div className="col-span-2 flex items-center gap-1 text-zinc-400">
                  <Calendar className="h-3 w-3 shrink-0" />
                  {date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </div>
                <div className="col-span-3 flex items-center gap-1.5">
                  <Hash className="h-3 w-3 shrink-0 text-zinc-300" />
                  <span className="truncate font-mono text-[10px] text-zinc-500">{file.hash.slice(0, 16)}...</span>
                  <span className={clsx(
                    "shrink-0 rounded px-1 py-0.5 text-[9px] font-medium",
                    file.hash_status === "full" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                    file.hash_status === "partial" && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                    file.hash_status === "cached" && "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
                  )}>
                    {file.hash_status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
