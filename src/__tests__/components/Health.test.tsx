import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { HealthScoreHero } from "@/components/health/HealthScoreHero";
import { ScoreBreakdown } from "@/components/health/ScoreBreakdown";
import { RecommendationPanel } from "@/components/health/RecommendationPanel";
import { PotentialSavings } from "@/components/health/PotentialSavings";
import { TrendVisualization } from "@/components/health/TrendVisualization";
import { HealthQuickActions } from "@/components/health/HealthQuickActions";
import type { HealthScore, HealthFactor, HealthRecommendation, PotentialSavings as PotentialSavingsType, HealthTrend, TrendDataPoint } from "@/types";

const mockPotentialSavings: PotentialSavingsType = {
  total: 36_600_000_000,
  duplicates: 11_700_000_000,
  cache: 6_300_000_000,
  large_files: 18_600_000_000,
  duplicate_savings: 11_700_000_000,
  cache_savings: 6_300_000_000,
  large_file_savings: 18_600_000_000,
};

const trendDataPoints: TrendDataPoint[] = [
  { date: "05/15", score: 68, value: 68 },
  { date: "05/20", score: 70, value: 70 },
  { date: "05/25", score: 69, value: 69 },
  { date: "05/30", score: 71, value: 71 },
  { date: "06/05", score: 70, value: 70 },
  { date: "06/10", score: 72, value: 72 },
  { date: "06/15", score: 72, value: 72 },
];

const mockHealthTrend: HealthTrend = {
  one_day: 72,
  seven_days: 70,
  thirty_days: 68,
  ninety_days: 65,
  data_points: trendDataPoints,
  health: trendDataPoints,
  storage: trendDataPoints.map((p) => ({ ...p, value: p.value - 7 })),
  savings: trendDataPoints.map((p) => ({ ...p, value: p.value - 50 })),
};

const mockHealthFactors: HealthFactor[] = [
  { name: "free_space", label: "Free Space", score: 45, weight: 30, impact: -15, color: "#f97316", icon: "HardDrive", description: "Low free space on primary drive" },
  { name: "duplicates", label: "Duplicate Files", score: 65, weight: 15, impact: -5, color: "#eab308", icon: "Copy", description: "Some duplicate files detected" },
  { name: "temp_cache", label: "Temp & Cache", score: 80, weight: 15, impact: -3, color: "#22c55e", icon: "Trash2", description: "Cache is manageable" },
  { name: "large_files", label: "Large Files", score: 72, weight: 15, impact: -4, color: "#3b82f6", icon: "File", description: "Large files present" },
  { name: "fragmentation", label: "Fragmentation", score: 90, weight: 10, impact: -1, color: "#22c55e", icon: "Zap", description: "Low fragmentation" },
  { name: "system_health", label: "System Health", score: 95, weight: 10, impact: 0, color: "#22c55e", icon: "Activity", description: "System is healthy" },
  { name: "recent_activity", label: "Recent Activity", score: 85, weight: 5, impact: -2, color: "#22c55e", icon: "Clock", description: "Normal activity" },
];

const mockHealthRecommendations: HealthRecommendation[] = [
  { id: "rec-1", message: "Free up space on C: drive", category: "storage", priority: "high", impact_estimate: "Free ~150 GB", action_label: "Start Scan" },
  { id: "rec-2", message: "Remove duplicate files to reclaim space", category: "duplicates", priority: "high", impact_estimate: "Reclaim ~6.8 GB", action_label: "Start Scan" },
  { id: "rec-3", message: "Clear browser and system caches", category: "cache", priority: "high", impact_estimate: "Reclaim ~6.8 GB", action_label: "Start Scan" },
  { id: "rec-4", message: "Review and archive large video files", category: "large_files", priority: "medium", impact_estimate: "Free ~150 GB", action_label: "Start Scan" },
  { id: "rec-5", message: "Consolidate scattered project backups", category: "organization", priority: "medium", impact_estimate: "Free ~150 GB", action_label: "Start Scan" },
  { id: "rec-6", message: "Enable automatic cache cleaning", category: "maintenance", priority: "low", impact_estimate: "Free ~150 GB", action_label: "Start Scan" },
];

const mockHealthScore: HealthScore = {
  overall_score: 72,
  grade: "C",
  factors: mockHealthFactors,
  recommendations: mockHealthRecommendations,
  savings: mockPotentialSavings,
  trend: mockHealthTrend,
  status_label: "Fair",
  last_analysis: "15 Jun, 17:30",
};

describe("HealthScoreHero", () => {
  it("renders score and grade", () => {
    render(<HealthScoreHero score={mockHealthScore} />);
    expect(screen.getByText("Health Score")).toBeInTheDocument();
    expect(screen.getByText("72")).toBeInTheDocument();
    expect(screen.getByText(/Grade C/)).toBeInTheDocument();
  });

  it("renders last analysis time", () => {
    render(<HealthScoreHero score={mockHealthScore} />);
    expect(screen.getByText("15 Jun, 17:30")).toBeInTheDocument();
  });

  it("renders loading skeleton", () => {
    const { container } = render(<HealthScoreHero score={null} loading />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders empty state", () => {
    render(<HealthScoreHero score={null} />);
    expect(
      screen.getByText("Run a health assessment to see your storage health score."),
    ).toBeInTheDocument();
  });

  it("renders error state", () => {
    render(<HealthScoreHero score={null} error="Analysis failed" />);
    expect(screen.getByText("Analysis failed")).toBeInTheDocument();
  });

  it("calls onRetry when error state button is clicked", async () => {
    const onRetry = vi.fn();
    render(<HealthScoreHero score={null} error="Failed" onRetry={onRetry} />);
    await userEvent.click(screen.getByText("Try Again"));
    expect(onRetry).toHaveBeenCalled();
  });

  it("renders grade A for high score", () => {
    render(
      <HealthScoreHero
        score={{ overall_score: 95, grade: "A", status_label: "Excellent", last_analysis: null, factors: [], recommendations: [], savings: { total: 0, duplicates: 0, cache: 0, large_files: 0, duplicate_savings: 0, cache_savings: 0, large_file_savings: 0 }, trend: { one_day: 0, seven_days: 0, thirty_days: 0, ninety_days: 0, data_points: [], health: [], storage: [], savings: [] } }}
      />,
    );
    expect(screen.getByText("95")).toBeInTheDocument();
    expect(screen.getByText(/Grade A/)).toBeInTheDocument();
  });

  it("renders grade E for critical score", () => {
    render(
      <HealthScoreHero
        score={{ overall_score: 25, grade: "E", status_label: "Critical", last_analysis: null, factors: [], recommendations: [], savings: { total: 0, duplicates: 0, cache: 0, large_files: 0, duplicate_savings: 0, cache_savings: 0, large_file_savings: 0 }, trend: { one_day: 0, seven_days: 0, thirty_days: 0, ninety_days: 0, data_points: [], health: [], storage: [], savings: [] } }}
      />,
    );
    expect(screen.getByText("25")).toBeInTheDocument();
    expect(screen.getByText(/Grade E/)).toBeInTheDocument();
  });
});

describe("ScoreBreakdown", () => {
  it("renders all factors sorted by score ascending", () => {
    render(<ScoreBreakdown factors={mockHealthFactors} />);
    expect(screen.getByText("Score Breakdown")).toBeInTheDocument();
    expect(screen.getByText("Free Space")).toBeInTheDocument();
    expect(screen.getByText("Duplicate Files")).toBeInTheDocument();
    expect(screen.getByText("Temp & Cache")).toBeInTheDocument();
    expect(screen.getByText("Large Files")).toBeInTheDocument();
    expect(screen.getByText("Fragmentation")).toBeInTheDocument();
  });

  it("renders factor weights", () => {
    render(<ScoreBreakdown factors={mockHealthFactors} />);
    expect(screen.getByText("(30%)")).toBeInTheDocument();
    expect(screen.getAllByText("(15%)").length).toBe(3);
    expect(screen.getAllByText("(10%)").length).toBe(2);
    expect(screen.getByText("(5%)")).toBeInTheDocument();
  });

  it("renders factor scores", () => {
    render(<ScoreBreakdown factors={mockHealthFactors} />);
    expect(screen.getByText("45")).toBeInTheDocument();
    expect(screen.getByText("95")).toBeInTheDocument();
  });

  it("renders loading skeleton", () => {
    const { container } = render(<ScoreBreakdown factors={[]} loading />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders empty state", () => {
    render(<ScoreBreakdown factors={[]} />);
    expect(
      screen.getByText("Run a health assessment to see factor breakdown."),
    ).toBeInTheDocument();
  });
});

describe("RecommendationPanel", () => {
  it("renders all recommendations", () => {
    render(<RecommendationPanel recommendations={mockHealthRecommendations} />);
    expect(screen.getByText("Recommendations")).toBeInTheDocument();
    expect(screen.getByText("6 items")).toBeInTheDocument();
  });

  it("renders priority sections", () => {
    render(<RecommendationPanel recommendations={mockHealthRecommendations} />);
    expect(screen.getByText("High Priority")).toBeInTheDocument();
    expect(screen.getByText("Medium Priority")).toBeInTheDocument();
    expect(screen.getByText("Low Priority")).toBeInTheDocument();
  });

  it("renders impact estimates", () => {
    render(<RecommendationPanel recommendations={mockHealthRecommendations} />);
    expect(screen.getAllByText(/Free ~150 GB/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Reclaim ~6.8 GB/).length).toBeGreaterThan(0);
  });

  it("renders action buttons", () => {
    render(<RecommendationPanel recommendations={mockHealthRecommendations} />);
    const buttons = screen.getAllByText("Start Scan");
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it("calls onAction when action button clicked", async () => {
    const onAction = vi.fn();
    render(<RecommendationPanel recommendations={mockHealthRecommendations} onAction={onAction} />);
    const buttons = screen.getAllByRole("button");
    await userEvent.click(buttons[0]);
    expect(onAction).toHaveBeenCalled();
  });

  it("renders loading skeleton", () => {
    const { container } = render(<RecommendationPanel recommendations={[]} loading />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders empty state", () => {
    render(<RecommendationPanel recommendations={[]} />);
    expect(
      screen.getByText("No recommendations yet. Run a health assessment."),
    ).toBeInTheDocument();
  });
});

describe("PotentialSavings", () => {
  it("renders savings categories", () => {
    render(<PotentialSavings savings={mockPotentialSavings} />);
    expect(screen.getByText("Potential Savings")).toBeInTheDocument();
    expect(screen.getByText("Duplicate Savings")).toBeInTheDocument();
    expect(screen.getByText("Cache Savings")).toBeInTheDocument();
    expect(screen.getByText("Large File Savings")).toBeInTheDocument();
  });

  it("renders formatted savings values", () => {
    render(<PotentialSavings savings={mockPotentialSavings} />);
    expect(screen.getByText("10.9 GB")).toBeInTheDocument();
    expect(screen.getByText("5.9 GB")).toBeInTheDocument();
    expect(screen.getByText("17.3 GB")).toBeInTheDocument();
  });

  it("renders total savings in header", () => {
    render(<PotentialSavings savings={mockPotentialSavings} />);
    expect(screen.getByText("34.1 GB")).toBeInTheDocument();
  });

  it("renders loading skeleton", () => {
    const { container } = render(<PotentialSavings savings={null} loading />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders empty state", () => {
    render(<PotentialSavings savings={null} />);
    expect(
      screen.getByText("Run a health assessment to see potential savings."),
    ).toBeInTheDocument();
  });
});

describe("TrendVisualization", () => {
  it("renders trend cards", () => {
    render(<TrendVisualization trend={mockHealthTrend} />);
    expect(screen.getByText("Trends")).toBeInTheDocument();
    expect(screen.getByText("Health Trend")).toBeInTheDocument();
    expect(screen.getByText("Storage Trend")).toBeInTheDocument();
    expect(screen.getByText("Savings Trend")).toBeInTheDocument();
  });

  it("renders latest trend values", () => {
    render(<TrendVisualization trend={mockHealthTrend} />);
    expect(screen.getByText("72")).toBeInTheDocument();
    expect(screen.getByText("65%")).toBeInTheDocument();
  });

  it("renders date range labels", () => {
    render(<TrendVisualization trend={mockHealthTrend} />);
    const dateCells = screen.getAllByText(/^\d{2}\/\d{2}$/);
    expect(dateCells.length).toBeGreaterThanOrEqual(2);
  });

  it("renders loading skeleton", () => {
    const { container } = render(<TrendVisualization trend={null} loading />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders empty state", () => {
    render(<TrendVisualization trend={null} />);
    expect(
      screen.getByText("Run a health assessment to see trend data."),
    ).toBeInTheDocument();
  });
});

describe("HealthQuickActions", () => {
  it("renders default actions", () => {
    render(<HealthQuickActions />);
    expect(screen.getByText("Quick Actions")).toBeInTheDocument();
    expect(screen.getByText("Start Scan")).toBeInTheDocument();
    expect(screen.getByText("Find Duplicates")).toBeInTheDocument();
    expect(screen.getByText("Clean Cache")).toBeInTheDocument();
    expect(screen.getByText("View Report")).toBeInTheDocument();
  });

  it("fires onAction when clicked", async () => {
    const onAction = vi.fn();
    render(<HealthQuickActions onAction={onAction} />);
    await userEvent.click(screen.getByText("Start Scan"));
    expect(onAction).toHaveBeenCalledWith("start-scan");
  });

  it("renders custom actions", () => {
    const customActions = [
      {
        id: "custom",
        label: "Custom Action",
        icon: <span />,
        variant: "primary" as const,
        description: "Test",
      },
    ];
    render(<HealthQuickActions actions={customActions} />);
    expect(screen.getByText("Custom Action")).toBeInTheDocument();
  });

  it("renders loading skeleton", () => {
    const { container } = render(<HealthQuickActions loading />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });
});
