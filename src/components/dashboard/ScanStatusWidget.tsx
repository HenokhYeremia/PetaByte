import { Card, CardContent } from "@/components/ui/Card";
import { clsx } from "clsx";
import { Spinner } from "@/components/ui/Spinner";
import { CheckCircle2, AlertCircle, Clock } from "lucide-react";
import type { ScanStatusData } from "@/types";

interface ScanStatusWidgetProps {
  data: ScanStatusData | null;
  loading?: boolean;
}

const statusConfig: Record<string, { icon: React.ElementType; label: string; description: string; color: string; bg: string }> = {
  idle: {
    icon: Clock,
    label: "Idle",
    description: "Ready to scan",
    color: "text-zinc-400 dark:text-zinc-500",
    bg: "bg-zinc-100 dark:bg-zinc-800",
  },
  running: {
    icon: Spinner,
    label: "Scanning",
    description: "Scan in progress",
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-900/20",
  },
  completed: {
    icon: CheckCircle2,
    label: "Completed",
    description: "Scan finished successfully",
    color: "text-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
  },
  failed: {
    icon: AlertCircle,
    label: "Failed",
    description: "Scan encountered errors",
    color: "text-red-500",
    bg: "bg-red-50 dark:bg-red-900/20",
  },
};

export function ScanStatusWidget({ data, loading }: ScanStatusWidgetProps) {
  if (loading) {
    return (
      <Card padding="sm">
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
            <div className="space-y-1">
              <div className="h-4 w-20 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-3 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const cfg = statusConfig[data.status];
  const Icon = cfg.icon;

  return (
    <Card
      padding="sm"
      className={clsx("border-l-4", {
        "border-l-zinc-300 dark:border-l-zinc-600": data.status === "idle",
        "border-l-blue-500": data.status === "running",
        "border-l-emerald-500": data.status === "completed",
        "border-l-red-500": data.status === "failed",
      })}
    >
      <CardContent>
        <div className="flex items-center gap-3">
          <div className={clsx("flex h-8 w-8 items-center justify-center rounded-full", cfg.bg)}>
            {data.status === "running" ? (
              <Spinner size="sm" className="text-blue-500" />
            ) : (
              <Icon className={clsx("h-4 w-4", cfg.color)} />
            )}
          </div>
          <div>
            <div className={clsx("text-sm font-medium", cfg.color)}>{cfg.label}</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              {data.status === "running" && data.current_file
                ? data.current_file
                : cfg.description}
            </div>
          </div>
          {data.status === "running" && (
            <div className="ml-auto text-sm font-medium text-zinc-500 dark:text-zinc-400">
              {data.progress_percent}%
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
