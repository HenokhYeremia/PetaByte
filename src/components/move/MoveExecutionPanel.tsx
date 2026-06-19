import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Play, Square, Pause, RotateCcw, FileText, Clock, ArrowRight } from "lucide-react";
import { formatBytes, formatDuration } from "@/types/format";
import { clsx } from "clsx";
import type { MockMoveProgress } from "@/mocks/move";
import type { MoveStatus } from "@/stores/moveStore";

interface MoveExecutionPanelProps {
  status: MoveStatus;
  progress: MockMoveProgress | null;
  onStart: () => void;
  onCancel: () => void;
  onPause: () => void;
  onResume: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export function MoveExecutionPanel({
  status,
  progress,
  onStart,
  onCancel,
  onPause,
  onResume,
  disabled,
  loading,
}: MoveExecutionPanelProps) {
  const isActive = status === "moving" || status === "paused";
  const isIdle = status === "idle" || status === "previewing" || status === "ready";
  const isTerminal = status === "completed" || status === "cancelled" || status === "failed";

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Execution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-10 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Execution</CardTitle>
        {isActive && (
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            {status === "paused" ? "Paused" : "Moving"}
          </span>
        )}
        {isTerminal && (
          <span className={clsx(
            "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
            status === "completed" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
            status === "cancelled" && "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
            status === "failed" && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
          )}>
            {status === "completed" && "Completed"}
            {status === "cancelled" && "Cancelled"}
            {status === "failed" && "Failed"}
          </span>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {isIdle && (
            <Button variant="primary" size="md" onClick={onStart} disabled={disabled}>
              <Play className="h-4 w-4" />
              Start Move
            </Button>
          )}
          {isActive && status === "moving" && (
            <>
              <Button variant="secondary" size="md" onClick={onPause}>
                <Pause className="h-4 w-4" />
                Pause
              </Button>
              <Button variant="danger" size="md" onClick={onCancel}>
                <Square className="h-4 w-4" />
                Cancel
              </Button>
            </>
          )}
          {isActive && status === "paused" && (
            <>
              <Button variant="primary" size="md" onClick={onResume}>
                <Play className="h-4 w-4" />
                Resume
              </Button>
              <Button variant="danger" size="md" onClick={onCancel}>
                <Square className="h-4 w-4" />
                Cancel
              </Button>
            </>
          )}
          {isTerminal && (
            <Button variant="secondary" size="md" onClick={onStart}>
              <RotateCcw className="h-4 w-4" />
              Start New
            </Button>
          )}
        </div>

        {progress && isActive && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span>{progress.moved_files} of {progress.total_files} files</span>
              <span>{formatBytes(progress.moved_bytes)} of {formatBytes(progress.total_bytes)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${Math.min(100, (progress.moved_bytes / Math.max(1, progress.total_bytes)) * 100)}%` }}
              />
            </div>
            {progress.current_file && (
              <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                <FileText className="h-3 w-3 shrink-0" />
                <span className="truncate">{progress.current_file}</span>
              </div>
            )}
            <div className="flex items-center gap-4 text-xs text-zinc-400">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Elapsed: {formatDuration(progress.elapsed_secs)}
              </span>
              {progress.eta_secs !== null && (
                <span className="flex items-center gap-1">
                  <ArrowRight className="h-3 w-3" />
                  ETA: {formatDuration(progress.eta_secs)}
                </span>
              )}
            </div>
          </div>
        )}

        {!progress && isIdle && (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <ArrowRight className="h-8 w-8 text-zinc-300 dark:text-zinc-600" />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Configure and preview to start moving files</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
