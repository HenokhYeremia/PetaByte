import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { clsx } from "clsx";
import type { HealthScore } from "@/types";

interface HealthScoreCardProps {
  data: HealthScore | null;
  loading?: boolean;
}

interface HealthGaugeProps {
  score: number;
  grade: string;
}

const gradeConfig: Record<string, { color: string; label: string; level: string }> = {
  A: { color: "#22c55e", label: "Excellent", level: "health-excellent" },
  B: { color: "#86efac", label: "Good", level: "health-good" },
  C: { color: "#eab308", label: "Fair", level: "health-fair" },
  D: { color: "#f97316", label: "Poor", level: "health-poor" },
  E: { color: "#ef4444", label: "Critical", level: "health-critical" },
};

function HealthGauge({ score }: HealthGaugeProps) {
  const grade =
    score >= 90 ? "A" : score >= 75 ? "B" : score >= 55 ? "C" : score >= 35 ? "D" : "E";
  const cfg = gradeConfig[grade];
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          className="text-zinc-200 dark:text-zinc-800"
        />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke={cfg.color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-3xl font-bold"
          style={{ color: cfg.color }}
        >
          {score}
        </span>
        <span
          className="text-xs font-medium uppercase tracking-wide"
          style={{ color: cfg.color }}
        >
          {cfg.label}
        </span>
      </div>
    </div>
  );
}

export function HealthScoreCard({ data, loading }: HealthScoreCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Health Score</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <div className="h-[140px] w-[140px] animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Health Score</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-400">Run a health assessment to see your score.</p>
        </CardContent>
      </Card>
    );
  }

  const cfg = gradeConfig[data.grade];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Health Score</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <HealthGauge score={data.overall_score} grade={data.grade} />
        <div className="text-center">
          <span
            className={clsx(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
              cfg.level === "health-excellent" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
              cfg.level === "health-good" && "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-300",
              cfg.level === "health-fair" && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
              cfg.level === "health-poor" && "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
              cfg.level === "health-critical" && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
            )}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: cfg.color }}
            />
            Grade {data.grade} — {cfg.label}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
