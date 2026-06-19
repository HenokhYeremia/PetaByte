import { type ReactNode } from "react";
import { clsx } from "clsx";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: ReactNode;
  trend?: { direction: "up" | "down"; label: string };
  loading?: boolean;
  empty?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  loading,
  empty,
  emptyMessage = "No data available",
  className,
}: StatCardProps) {
  if (loading) {
    return (
      <Card className={clsx("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-5 rounded" />
        </div>
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-3 w-32" />
      </Card>
    );
  }

  if (empty) {
    return (
      <Card className={clsx("flex flex-col items-center justify-center py-8 text-center", className)}>
        {icon && <div className="mb-3 text-zinc-300 dark:text-zinc-600">{icon}</div>}
        <p className="text-sm text-zinc-400 dark:text-zinc-500">{emptyMessage}</p>
      </Card>
    );
  }

  return (
    <Card className={clsx("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{title}</span>
        {icon && <div className="text-zinc-400 dark:text-zinc-500">{icon}</div>}
      </div>
      <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{value}</div>
      {(subtitle || trend) && (
        <div className="flex items-center gap-2">
          {subtitle && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</span>
          )}
          {trend && (
            <span
              className={clsx(
                "inline-flex items-center gap-0.5 text-xs font-medium",
                trend.direction === "up"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400",
              )}
            >
              <span>{trend.direction === "up" ? "↑" : "↓"}</span>
              {trend.label}
            </span>
          )}
        </div>
      )}
    </Card>
  );
}
