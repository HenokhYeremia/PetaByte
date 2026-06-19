import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Clock } from "lucide-react";
import { clsx } from "clsx";
import type { MockHealthScore } from "@/mocks/health";

interface HealthScoreHeroProps {
  score: MockHealthScore | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

const gradeConfig: Record<string, { color: string; bg: string; ring: string; label: string }> = {
  A: { color: "#22c55e", bg: "bg-green-100 dark:bg-green-900/30", ring: "ring-green-500", label: "Excellent" },
  B: { color: "#86efac", bg: "bg-green-50 dark:bg-green-900/20", ring: "ring-green-400", label: "Good" },
  C: { color: "#eab308", bg: "bg-yellow-100 dark:bg-yellow-900/30", ring: "ring-yellow-500", label: "Fair" },
  D: { color: "#f97316", bg: "bg-orange-100 dark:bg-orange-900/30", ring: "ring-orange-500", label: "Poor" },
  E: { color: "#ef4444", bg: "bg-red-100 dark:bg-red-900/30", ring: "ring-red-500", label: "Critical" },
};

function HealthGauge({ score, grade }: { score: number; grade: string }) {
  const cfg = gradeConfig[grade] || gradeConfig.C;
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg width="160" height="160" viewBox="0 0 160 160" className="-rotate-90">
        <circle
          cx="80" cy="80" r={radius}
          fill="none" stroke="currentColor" strokeWidth="12"
          className="text-zinc-200 dark:text-zinc-800"
        />
        <circle
          cx="80" cy="80" r={radius}
          fill="none" stroke={cfg.color} strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold" style={{ color: cfg.color }}>
          {score}
        </span>
        <span className="text-xs font-medium uppercase tracking-wide" style={{ color: cfg.color }}>
          {cfg.label}
        </span>
      </div>
    </div>
  );
}

export function HealthScoreHero({ score, loading, error, onRetry }: HealthScoreHeroProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Health Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4 py-4">
            <Skeleton className="h-40 w-40 rounded-full" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Health Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="text-3xl text-red-500">!</div>
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="text-sm font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400"
              >
                Try Again
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!score) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Health Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="text-4xl text-zinc-300 dark:text-zinc-600">?</div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Run a health assessment to see your storage health score.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const cfg = gradeConfig[score.grade] || gradeConfig.C;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Health Score</CardTitle>
        {score.last_analysis && (
          <span className="flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500">
            <Clock className="h-3 w-3" />
            {score.last_analysis}
          </span>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-4">
          <HealthGauge score={score.overall_score} grade={score.grade} />
          <span
            className={clsx(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
              cfg.bg,
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cfg.color }} />
            Grade {score.grade} — {cfg.label}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
