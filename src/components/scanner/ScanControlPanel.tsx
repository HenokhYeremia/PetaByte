import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Play, Pause, RotateCcw, XCircle, ScanLine } from "lucide-react";
import { clsx } from "clsx";

type ScanStatus = "idle" | "scanning" | "paused" | "completed" | "cancelled" | "failed";

interface ScanControlPanelProps {
  status: ScanStatus;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export function ScanControlPanel({
  status,
  onStart,
  onPause,
  onResume,
  onCancel,
  disabled,
  loading,
}: ScanControlPanelProps) {
  if (loading) {
    return (
      <Card>
        <CardContent>
          <div className="flex animate-pulse gap-3">
            <div className="h-10 flex-1 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-10 w-24 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-10 w-24 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <div className="flex flex-wrap items-center gap-3">
          {status === "idle" && (
            <Button variant="primary" size="lg" onClick={onStart} disabled={disabled} className="flex-1 sm:flex-none">
              <ScanLine className="h-5 w-5" />
              Start Scan
            </Button>
          )}
          {status === "scanning" && (
            <>
              <Button variant="secondary" size="lg" onClick={onPause} className="flex-1 sm:flex-none">
                <Pause className="h-5 w-5" />
                Pause
              </Button>
              <Button variant="danger" size="lg" onClick={onCancel} className="flex-1 sm:flex-none">
                <XCircle className="h-5 w-5" />
                Cancel
              </Button>
            </>
          )}
          {status === "paused" && (
            <>
              <Button variant="primary" size="lg" onClick={onResume} className="flex-1 sm:flex-none">
                <Play className="h-5 w-5" />
                Resume
              </Button>
              <Button variant="danger" size="lg" onClick={onCancel} className="flex-1 sm:flex-none">
                <XCircle className="h-5 w-5" />
                Cancel
              </Button>
            </>
          )}
          {(status === "completed" || status === "cancelled" || status === "failed") && (
            <Button variant="primary" size="lg" onClick={onStart} disabled={disabled} className="flex-1 sm:flex-none">
              <RotateCcw className="h-5 w-5" />
              Scan Again
            </Button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <span className={clsx(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
              status === "idle" && "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
              status === "scanning" && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
              status === "paused" && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
              status === "completed" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
              status === "cancelled" && "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
              status === "failed" && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
            )}>
              <span className={clsx(
                "h-1.5 w-1.5 rounded-full",
                status === "idle" && "bg-zinc-400",
                status === "scanning" && "bg-blue-500 animate-pulse",
                status === "paused" && "bg-amber-500",
                status === "completed" && "bg-emerald-500",
                status === "cancelled" && "bg-zinc-400",
                status === "failed" && "bg-red-500",
              )} />
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
