import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { clsx } from "clsx";
import { Copy, Trash2, File } from "lucide-react";
import { formatBytes } from "@/types/format";
import type { PotentialSavings } from "@/types";

interface PotentialSavingsProps {
  savings: PotentialSavings | null;
  loading?: boolean;
}

const savingItems = [
  { key: "duplicate_savings" as const, label: "Duplicate Savings", icon: Copy, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20" },
  { key: "cache_savings" as const, label: "Cache Savings", icon: Trash2, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/20" },
  { key: "large_file_savings" as const, label: "Large File Savings", icon: File, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-900/20" },
];

export function PotentialSavings({ savings, loading }: PotentialSavingsProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Potential Savings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!savings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Potential Savings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-400 dark:text-zinc-500">
            Run a health assessment to see potential savings.
          </p>
        </CardContent>
      </Card>
    );
  }

  const total =
    savings.duplicate_savings + savings.cache_savings + savings.large_file_savings;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Potential Savings</CardTitle>
        <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
          {formatBytes(total)}
        </span>
      </CardHeader>
      <CardContent className="space-y-3">
        {savingItems.map(({ key, label, icon: Icon, color, bg }) => (
          <div key={key} className="flex items-center gap-3 rounded-lg p-3">
            <div className={clsx("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", bg)}>
              <Icon className={clsx("h-5 w-5", color)} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{label}</p>
              <p className={clsx("text-xs font-semibold", color)}>{formatBytes(savings[key])}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
