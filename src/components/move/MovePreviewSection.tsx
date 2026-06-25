import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Search, X, ArrowRight, AlertTriangle, CheckCircle2, XCircle, AlertCircle, Clock } from "lucide-react";
import { formatBytes } from "@/types/format";
import { clsx } from "clsx";
import type { MoveOperation, MoveFilterState, ConflictStatus, ValidationStatus, Resolution } from "@/types";

interface MovePreviewSectionProps {
  operations: MoveOperation[];
  filter: MoveFilterState;
  onFilterChange: (partial: Partial<MoveFilterState>) => void;
  onSetResolution: (operationId: string, resolution: Resolution) => void;
  onSetAllResolutions: (resolution: Resolution) => void;
  loading?: boolean;
}

const conflictIcons: Record<ConflictStatus, { icon: React.ReactNode; color: string }> = {
  none: { icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: "text-emerald-500" },
  exists: { icon: <AlertTriangle className="h-3.5 w-3.5" />, color: "text-amber-500" },
  same_file: { icon: <AlertTriangle className="h-3.5 w-3.5" />, color: "text-amber-500" },
  permission_denied: { icon: <XCircle className="h-3.5 w-3.5" />, color: "text-red-500" },
  insufficient_space: { icon: <AlertTriangle className="h-3.5 w-3.5" />, color: "text-red-500" },
  invalid_path: { icon: <XCircle className="h-3.5 w-3.5" />, color: "text-red-500" },
  rename_needed: { icon: <AlertCircle className="h-3.5 w-3.5" />, color: "text-blue-500" },
};

const validationIcons: Record<ValidationStatus, { icon: React.ReactNode; color: string }> = {
  pending: { icon: <Clock className="h-3.5 w-3.5" />, color: "text-zinc-400" },
  valid: { icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: "text-emerald-500" },
  invalid: { icon: <XCircle className="h-3.5 w-3.5" />, color: "text-red-500" },
  warning: { icon: <AlertTriangle className="h-3.5 w-3.5" />, color: "text-amber-500" },
  error: { icon: <XCircle className="h-3.5 w-3.5" />, color: "text-red-500" },
};

export function MovePreviewSection({
  operations,
  filter,
  onFilterChange,
  onSetResolution,
  onSetAllResolutions,
  loading,
}: MovePreviewSectionProps) {
  const filtered = operations.filter((op) => {
    if (filter.search && !op.source_name.toLowerCase().includes(filter.search.toLowerCase()) && !op.source.toLowerCase().includes(filter.search.toLowerCase())) return false;
    if (filter.conflictFilter !== "all" && op.conflict_status !== filter.conflictFilter) return false;
    if (filter.validationFilter !== "all" && op.validation_status !== filter.validationFilter) return false;
    return true;
  });

  const hasConflicts = filtered.some((op) => op.conflict_status !== "none" || op.validation_status !== "valid");

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Move Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-9 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!operations || operations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Move Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <ArrowRight className="h-10 w-10 text-zinc-300 dark:text-zinc-600" />
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">No operations to preview</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">Select files and a destination to generate a preview</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Move Preview</CardTitle>
        <span className="text-xs text-zinc-400">{filtered.length} of {operations.length} operations</span>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="pointer-events-none absolute inset-y-0 left-0 ml-2.5 h-3.5 w-3.5 self-center text-zinc-400" />
            <input
              type="text"
              value={filter.search}
              onChange={(e) => onFilterChange({ search: e.target.value })}
              placeholder="Search files..."
              className="w-full rounded-md border border-zinc-300 bg-white py-1.5 pl-8 pr-7 text-xs text-zinc-900 placeholder-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
            {filter.search && (
              <button
                type="button"
                onClick={() => onFilterChange({ search: "" })}
                className="absolute inset-y-0 right-0 flex items-center pr-2 text-zinc-400"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <select
            value={filter.conflictFilter}
            onChange={(e) => onFilterChange({ conflictFilter: e.target.value as ConflictStatus | "all" })}
            className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs text-zinc-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
          >
            <option value="all">All Conflicts</option>
            <option value="none">No Conflict</option>
            <option value="exists">File Exists</option>
            <option value="rename_needed">Rename Needed</option>
          </select>
          <select
            value={filter.validationFilter}
            onChange={(e) => onFilterChange({ validationFilter: e.target.value as ValidationStatus | "all" })}
            className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs text-zinc-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
          >
            <option value="all">All Status</option>
            <option value="valid">Valid</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
          </select>
          {hasConflicts && (
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => onSetAllResolutions("replace")}>
                Replace All
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onSetAllResolutions("skip")}>
                Skip All
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-1">
          <div className="grid grid-cols-12 gap-2 rounded-md bg-zinc-50 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:bg-zinc-800/50">
            <div className="col-span-4">Source</div>
            <div className="col-span-3">Destination</div>
            <div className="col-span-1 text-right">Size</div>
            <div className="col-span-1 text-center">Method</div>
            <div className="col-span-1 text-center">Conflict</div>
            <div className="col-span-1 text-center">Status</div>
            <div className="col-span-1 text-center">Action</div>
          </div>
          {filtered.map((op) => {
            const conflict = conflictIcons[op.conflict_status];
            const validation = validationIcons[op.validation_status];
            return (
              <div
                key={op.id}
                className={clsx(
                  "grid grid-cols-12 gap-2 rounded-md px-3 py-2 text-xs transition-colors",
                  op.resolution === "skip" && "opacity-50",
                  op.validation_status === "error" && "bg-red-50 dark:bg-red-900/10",
                )}
              >
                <div className="col-span-4 truncate text-zinc-700 dark:text-zinc-300" title={op.source}>
                  {op.source_name}
                </div>
                <div className="col-span-3 truncate text-zinc-500 dark:text-zinc-400" title={op.destination}>
                  {op.dest_name}
                </div>
                <div className="col-span-1 text-right text-zinc-500">{formatBytes(op.size)}</div>
                <div className="col-span-1 text-center">
                  <span className={clsx(
                    "rounded px-1 py-0.5 text-[9px] font-medium",
                    op.method === "rename" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
                  )}>
                    {op.method === "rename" ? "RN" : "CD"}
                  </span>
                </div>
                <div className={clsx("col-span-1 flex items-center justify-center", conflict.color)} title={op.conflict_status}>
                  {conflict.icon}
                </div>
                <div className={clsx("col-span-1 flex items-center justify-center", validation.color)} title={op.validation_status}>
                  {validation.icon}
                </div>
                <div className="col-span-1 flex items-center justify-center">
                  <select
                    value={op.resolution}
                    onChange={(e) => onSetResolution(op.id, e.target.value as Resolution)}
                    className={clsx(
                      "w-full rounded border px-1 py-0.5 text-[9px] focus:outline-none",
                      op.resolution === "replace" && "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
                      op.resolution === "skip" && "border-zinc-300 bg-zinc-50 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
                      op.resolution === "keep_both" && "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
                    )}
                  >
                    <option value="keep_both">Keep Both</option>
                    <option value="replace">Replace</option>
                    <option value="skip">Skip</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
