import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { clsx } from "clsx";
import type { HealthTrend, TrendDataPoint } from "@/types";

interface TrendVisualizationProps {
  trend: HealthTrend | null;
  loading?: boolean;
}

function MiniChart({
  data,
  color,
  height = 80,
}: {
  data: TrendDataPoint[];
  color: string;
  height?: number;
}) {
  if (data.length < 2) return null;

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const width = 240;
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((d.value - min) / range) * (height - 10) - 5;
    return `${x},${y}`;
  });
  const polyline = points.join(" ");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="w-full">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={polyline}
      />
      {data.length > 0 && (
        <circle cx={width} cy={points[points.length - 1].split(",")[1]} r="3" fill={color} />
      )}
    </svg>
  );
}

function TrendCard({
  title,
  data,
  color,
  formatValue,
}: {
  title: string;
  data: TrendDataPoint[];
  color: string;
  formatValue: (v: number) => string;
}) {
  const latest = data[data.length - 1]?.value ?? 0;
  const first = data[0]?.value ?? 0;
  const change = latest - first;
  const isUp = change >= 0;

  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{title}</span>
        <span
          className={clsx(
            "text-xs font-medium",
            isUp ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
          )}
        >
          {isUp ? "+" : ""}
          {formatValue(change)} ({isUp ? "+" : ""}
          {change.toFixed(1)})
        </span>
      </div>
      <div className="flex items-end gap-4">
        <div className="flex-1">
          <MiniChart data={data} color={color} />
        </div>
        <div className="shrink-0 text-right">
          <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            {formatValue(latest)}
          </span>
        </div>
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-zinc-400 dark:text-zinc-500">
        <span>{data[0]?.date ?? ""}</span>
        <span>{data[data.length - 1]?.date ?? ""}</span>
      </div>
    </div>
  );
}

export function TrendVisualization({ trend, loading }: TrendVisualizationProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Trends</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!trend) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-400 dark:text-zinc-500">
            Run a health assessment to see trend data.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trends</CardTitle>
        <span className="text-xs text-zinc-400">30-day view</span>
      </CardHeader>
      <CardContent className="space-y-4">
        <TrendCard
          title="Health Trend"
          data={trend.health}
          color="#22c55e"
          formatValue={(v) => `${v}`}
        />
        <TrendCard
          title="Storage Trend"
          data={trend.storage}
          color="#3b82f6"
          formatValue={(v) => `${v}%`}
        />
        <TrendCard
          title="Savings Trend"
          data={trend.savings}
          color="#a855f7"
          formatValue={(v) => `${v.toFixed(1)}%`}
        />
      </CardContent>
    </Card>
  );
}
