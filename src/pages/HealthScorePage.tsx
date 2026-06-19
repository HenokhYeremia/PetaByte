import { useCallback } from "react";
import { useHealthStore } from "@/stores/healthStore";
import {
  mockHealthScore,
  mockHealthFactors,
  mockHealthRecommendations,
  mockPotentialSavings,
  mockHealthTrend,
} from "@/mocks/health";
import { HealthScoreHero } from "@/components/health/HealthScoreHero";
import { ScoreBreakdown } from "@/components/health/ScoreBreakdown";
import { RecommendationPanel } from "@/components/health/RecommendationPanel";
import { PotentialSavings } from "@/components/health/PotentialSavings";
import { TrendVisualization } from "@/components/health/TrendVisualization";
import { HealthQuickActions } from "@/components/health/HealthQuickActions";

export function HealthScorePage() {
  const {
    score,
    factors,
    recommendations,
    savings,
    trend,
    status,
    loading,
    error,
    setScore,
    setFactors,
    setRecommendations,
    setSavings,
    setTrend,
    setStatus,
    setLoading,
    setError,
    analyze,
  } = useHealthStore();

  const handleAnalyze = useCallback(() => {
    analyze();
    setScore(null);
    setFactors([]);
    setRecommendations([]);
    setSavings(null);
    setTrend(null);
    setError(null);

    setTimeout(() => {
      setScore(mockHealthScore);
      setFactors(mockHealthFactors);
      setRecommendations(mockHealthRecommendations);
      setSavings(mockPotentialSavings);
      setTrend(mockHealthTrend);
      setStatus("ready");
      setLoading(false);
    }, 300);
  }, [analyze, setScore, setFactors, setRecommendations, setSavings, setTrend, setStatus, setLoading, setError]);

  const handleRetry = useCallback(() => {
    handleAnalyze();
  }, [handleAnalyze]);

  const handleQuickAction = useCallback(
    (actionId: string) => {
      if (actionId === "start-scan" || actionId === "find-duplicates" || actionId === "clean-cache") {
        handleAnalyze();
      }
    },
    [handleAnalyze],
  );

  const handleRecommendationAction = useCallback(
    () => {
      handleAnalyze();
    },
    [handleAnalyze],
  );

  const isEmpty = status === "idle" && !loading && !score;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Storage Health Score
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            7-factor weighted health analysis with trend tracking and recommendations.
          </p>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={loading || status === "analyzing"}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-400"
        >
          {loading || status === "analyzing" ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Analyzing...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              {isEmpty ? "Load Health Data" : "Re-analyze"}
            </>
          )}
        </button>
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-200 py-16 text-center dark:border-zinc-800">
          <svg className="mb-4 h-12 w-12 text-zinc-300 dark:text-zinc-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
          </svg>
          <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">No Health Data</h3>
          <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
            Run a health assessment to analyze your storage and get recommendations.
          </p>
          <button
            onClick={handleAnalyze}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            Load Health Data
          </button>
        </div>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <HealthScoreHero
                score={score}
                loading={loading}
                error={error}
                onRetry={handleRetry}
              />
            </div>
            <div className="lg:col-span-2">
              <ScoreBreakdown factors={factors} loading={loading} />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <RecommendationPanel
                recommendations={recommendations}
                loading={loading}
                onAction={handleRecommendationAction}
              />
            </div>
            <div className="space-y-6">
              <PotentialSavings savings={savings} loading={loading} />
              <TrendVisualization trend={trend} loading={loading} />
            </div>
          </div>

          <HealthQuickActions onAction={handleQuickAction} loading={loading} />
        </>
      )}
    </div>
  );
}
