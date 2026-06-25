import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { HardDrive, Copy, Trash2, File, Zap, Clock, Activity } from "lucide-react";
import type { HealthFactor } from "@/types";

interface ScoreBreakdownProps {
  factors: HealthFactor[];
  loading?: boolean;
}

const iconMap: Record<string, React.ReactNode> = {
  HardDrive: <HardDrive className="h-4 w-4" />,
  Copy: <Copy className="h-4 w-4" />,
  Trash2: <Trash2 className="h-4 w-4" />,
  File: <File className="h-4 w-4" />,
  Zap: <Zap className="h-4 w-4" />,
  Clock: <Clock className="h-4 w-4" />,
  Activity: <Activity className="h-4 w-4" />,
};

function FactorBar({ factor }: { factor: HealthFactor }) {
  const pct = factor.score;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-zinc-400 dark:text-zinc-500">{iconMap[factor.icon] || null}</span>
          <span className="font-medium text-zinc-900 dark:text-zinc-100">{factor.label}</span>
          <span className="text-xs text-zinc-400">({factor.weight}%)</span>
        </div>
        <span className="text-sm font-semibold" style={{ color: factor.color }}>
          {pct}
        </span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%`, backgroundColor: factor.color }}
        />
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{factor.description}</p>
    </div>
  );
}

export function ScoreBreakdown({ factors, loading }: ScoreBreakdownProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Score Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-3 w-64" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (factors.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Score Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-400 dark:text-zinc-500">
            Run a health assessment to see factor breakdown.
          </p>
        </CardContent>
      </Card>
    );
  }

  const sorted = [...factors].sort((a, b) => a.score - b.score);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Score Breakdown</CardTitle>
        <span className="text-xs text-zinc-400">Lower scores first</span>
      </CardHeader>
      <CardContent className="space-y-5">
        {sorted.map((factor) => (
          <FactorBar key={factor.name} factor={factor} />
        ))}
      </CardContent>
    </Card>
  );
}
