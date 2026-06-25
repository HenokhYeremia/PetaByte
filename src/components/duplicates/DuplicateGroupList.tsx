import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { CheckCircle2, Hash, FolderOpen, ChevronDown, ChevronRight, HardDrive, AlertTriangle } from "lucide-react";
import { formatBytes } from "@/types/format";
import { clsx } from "clsx";
import type { DuplicateGroup } from "@/types";

interface DuplicateGroupListProps {
  groups: DuplicateGroup[];
  selectedGroupId: string | null;
  selectedFileIds: Set<string>;
  onSelectGroup: (id: string | null) => void;
  onToggleGroup: (id: string, select: boolean) => void;
  onToggleFile: (groupId: string, fileId: string) => void;
  loading?: boolean;
}

export function DuplicateGroupList({
  groups,
  selectedGroupId,
  selectedFileIds,
  onSelectGroup,
  onToggleGroup,
  onToggleFile,
  loading,
}: DuplicateGroupListProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Duplicate Groups</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse space-y-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="h-4 w-4 rounded bg-zinc-200 dark:bg-zinc-800" />
                  <div className="h-4 w-48 rounded bg-zinc-200 dark:bg-zinc-800" />
                  <div className="ml-auto h-4 w-20 rounded bg-zinc-200 dark:bg-zinc-800" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!groups || groups.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Duplicate Groups</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-300 dark:text-emerald-600" />
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">No duplicates found</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              All files appear to be unique
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const allSelected = groups.every((g) =>
    g.files.every((f) => selectedFileIds.has(f.id)),
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <CardTitle>Duplicate Groups</CardTitle>
          <span className="text-xs text-zinc-400">{groups.length} groups</span>
        </div>
        <button
          type="button"
          onClick={() => {
            const newState = !allSelected;
            groups.forEach((g) => onToggleGroup(g.id, newState));
          }}
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
      <CardContent>
        <div className="space-y-2">
          {groups.map((group) => {
            const isExpanded = selectedGroupId === group.id;
            const groupSelected = group.files.every((f) => selectedFileIds.has(f.id));

            return (
              <div
                key={group.id}
                className={clsx(
                  "rounded-lg border transition-all",
                  isExpanded
                    ? "border-emerald-300 dark:border-emerald-700"
                    : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700",
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelectGroup(isExpanded ? null : group.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left"
                >
                  <div
                    role="checkbox"
                    aria-checked={groupSelected}
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleGroup(group.id, !groupSelected);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        onToggleGroup(group.id, !groupSelected);
                      }
                    }}
                    className={clsx(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                      groupSelected
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-800",
                    )}
                  >
                    {groupSelected && <CheckCircle2 className="h-3 w-3" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {group.files[0]?.file_name || "Unknown"}
                      </span>
                      <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                        {group.file_count} copies
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="inline-flex items-center gap-1">
                        <HardDrive className="h-3 w-3" />
                        {formatBytes(group.file_size)} each
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 text-amber-500" />
                        {formatBytes(group.total_wasted_bytes)} wasted
                      </span>
                      <span className="truncate inline-flex items-center gap-1">
                        <FolderOpen className="h-3 w-3" />
                        {group.common_parent}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 text-zinc-400">
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-zinc-100 px-4 py-2 dark:border-zinc-800">
                    <div className="mb-2 grid grid-cols-12 gap-2 px-2 text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                      <div className="col-span-5">Name</div>
                      <div className="col-span-3">Size</div>
                      <div className="col-span-2">Modified</div>
                      <div className="col-span-2">Hash</div>
                    </div>
                    {group.files.map((file) => {
                      const isFileSelected = selectedFileIds.has(file.id);
                      const date = new Date(file.modified_at);
                      return (
                        <div
                          key={file.id}
                          className="grid grid-cols-12 gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                        >
                          <div className="col-span-5 flex items-center gap-2">
                            <div
                              role="checkbox"
                              aria-checked={isFileSelected}
                              tabIndex={0}
                              onClick={() => onToggleFile(group.id, file.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  onToggleFile(group.id, file.id);
                                }
                              }}
                              className={clsx(
                                "flex h-3.5 w-3.5 shrink-0 cursor-pointer items-center justify-center rounded border transition-colors",
                                isFileSelected
                                  ? "border-emerald-500 bg-emerald-500 text-white"
                                  : "border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-800",
                              )}
                            >
                              {isFileSelected && <CheckCircle2 className="h-2.5 w-2.5" />}
                            </div>
                            <span className="truncate text-zinc-700 dark:text-zinc-300">{file.file_name}</span>
                          </div>
                          <div className="col-span-3 text-zinc-500">{formatBytes(file.file_size)}</div>
                          <div className="col-span-2 text-zinc-400">
                            {date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          </div>
                          <div className="col-span-2 flex items-center gap-1">
                            <Hash className="h-3 w-3 text-zinc-300" />
                            <span className={clsx(
                              "text-[10px] font-medium",
                              file.hash_status === "full" && "text-emerald-500",
                              file.hash_status === "partial" && "text-amber-500",
                              file.hash_status === "cached" && "text-zinc-400",
                            )}>
                              {file.hash_status}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
