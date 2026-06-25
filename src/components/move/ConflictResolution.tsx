import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Copy, ArrowRightFromLine, Trash2, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { clsx } from "clsx";
import type { MoveOperation, Resolution, ConflictStatus } from "@/types";

interface ConflictResolutionProps {
  operations: MoveOperation[];
  onSetResolution: (operationId: string, resolution: Resolution) => void;
  onSetAllResolutions: (resolution: Resolution) => void;
  loading?: boolean;
}

const conflictLabels: Record<ConflictStatus, string> = {
  none: "No conflict",
  exists: "File already exists",
  same_file: "Same file",
  permission_denied: "Permission denied",
  insufficient_space: "Insufficient space",
  invalid_path: "Invalid path",
  rename_needed: "Name collision - rename recommended",
};

export function ConflictResolution({
  operations,
  onSetResolution,
  onSetAllResolutions,
  loading,
}: ConflictResolutionProps) {
  const conflicts = operations.filter((op) => op.conflict_status !== "none" || op.validation_status !== "valid");

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conflict Resolution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (conflicts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conflict Resolution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-300 dark:text-emerald-600" />
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">No conflicts detected</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">All operations have valid paths</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>Conflict Resolution</CardTitle>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            {conflicts.length}
          </span>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => onSetAllResolutions("keep_both")}>
            <Copy className="h-3 w-3" />
            Keep All
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onSetAllResolutions("replace")}>
            <ArrowRightFromLine className="h-3 w-3" />
            Replace All
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onSetAllResolutions("skip")}>
            <Trash2 className="h-3 w-3" />
            Skip All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {conflicts.map((op) => (
          <div
            key={op.id}
            className={clsx(
              "rounded-lg border p-3 transition-colors",
              op.conflict_status === "exists" && "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/10",
              op.conflict_status === "rename_needed" && "border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/10",
              op.validation_status === "error" && "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-900/10",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {op.conflict_status !== "none" && (
                    <AlertTriangle className={clsx(
                      "h-4 w-4 shrink-0",
                      op.conflict_status === "exists" && "text-amber-500",
                      op.conflict_status === "rename_needed" && "text-blue-500",
                    )} />
                  )}
                  {op.validation_status === "error" && (
                    <XCircle className="h-4 w-4 shrink-0 text-red-500" />
                  )}
                  <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{op.source_name}</span>
                </div>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  {conflictLabels[op.conflict_status]}
                  {op.validation_status === "error" && " · Validation error: destination invalid"}
                  {op.validation_status === "warning" && " · Proceed with caution"}
                </p>
                <p className="mt-0.5 text-[10px] text-zinc-400 dark:text-zinc-500">
                  {op.source} → {op.destination}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => onSetResolution(op.id, "keep_both")}
                  className={clsx(
                    "rounded-md px-2 py-1 text-[10px] font-medium transition-colors",
                    op.resolution === "keep_both"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700",
                  )}
                >
                  <Copy className="inline h-3 w-3" /> Keep
                </button>
                <button
                  type="button"
                  onClick={() => onSetResolution(op.id, "replace")}
                  className={clsx(
                    "rounded-md px-2 py-1 text-[10px] font-medium transition-colors",
                    op.resolution === "replace"
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700",
                  )}
                >
                  <ArrowRightFromLine className="inline h-3 w-3" /> Replace
                </button>
                <button
                  type="button"
                  onClick={() => onSetResolution(op.id, "skip")}
                  className={clsx(
                    "rounded-md px-2 py-1 text-[10px] font-medium transition-colors",
                    op.resolution === "skip"
                      ? "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300"
                      : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700",
                  )}
                >
                  <Trash2 className="inline h-3 w-3" /> Skip
                </button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
