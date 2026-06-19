import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { AlertTriangle, AlertCircle, Info, ArrowRight } from "lucide-react";
import { clsx } from "clsx";
import type { MockHealthRecommendation } from "@/mocks/health";

interface RecommendationPanelProps {
  recommendations: MockHealthRecommendation[];
  loading?: boolean;
  onAction?: (id: string) => void;
}

const priorityConfig = {
  high: { icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50 dark:bg-red-900/20", border: "border-red-200 dark:border-red-800" },
  medium: { icon: AlertCircle, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/20", border: "border-amber-200 dark:border-amber-800" },
  low: { icon: Info, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20", border: "border-blue-200 dark:border-blue-800" },
};

const priorityLabel = { high: "High Priority", medium: "Medium Priority", low: "Low Priority" };

function RecommendationCard({
  rec,
  onAction,
}: {
  rec: MockHealthRecommendation;
  onAction?: (id: string) => void;
}) {
  const cfg = priorityConfig[rec.priority];
  const Icon = cfg.icon;

  return (
    <div className={clsx("rounded-lg border p-4", cfg.bg, cfg.border)}>
      <div className="flex items-start gap-3">
        <Icon className={clsx("mt-0.5 h-5 w-5 shrink-0", cfg.color)} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{rec.message}</p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Estimated impact: {rec.impact_estimate}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onAction?.(rec.id)}
          className="shrink-0"
        >
          {rec.action_label}
          <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

export function RecommendationPanel({ recommendations, loading, onAction }: RecommendationPanelProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-400 dark:text-zinc-500">
            No recommendations yet. Run a health assessment.
          </p>
        </CardContent>
      </Card>
    );
  }

  const grouped = {
    high: recommendations.filter((r) => r.priority === "high"),
    medium: recommendations.filter((r) => r.priority === "medium"),
    low: recommendations.filter((r) => r.priority === "low"),
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recommendations</CardTitle>
        <span className="text-xs text-zinc-400">{recommendations.length} items</span>
      </CardHeader>
      <CardContent className="space-y-4">
        {(Object.entries(grouped) as [keyof typeof grouped, MockHealthRecommendation[]][]).map(
          ([priority, recs]) =>
            recs.length > 0 && (
              <div key={priority}>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {priorityLabel[priority]}
                </h4>
                <div className="space-y-2">
                  {recs.map((rec) => (
                    <RecommendationCard key={rec.id} rec={rec} onAction={onAction} />
                  ))}
                </div>
              </div>
            ),
        )}
      </CardContent>
    </Card>
  );
}
