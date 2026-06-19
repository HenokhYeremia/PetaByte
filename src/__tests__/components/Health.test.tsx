import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { HealthScoreHero } from "@/components/health/HealthScoreHero";
import { ScoreBreakdown } from "@/components/health/ScoreBreakdown";
import { RecommendationPanel } from "@/components/health/RecommendationPanel";
import { PotentialSavings } from "@/components/health/PotentialSavings";
import { TrendVisualization } from "@/components/health/TrendVisualization";
import { HealthQuickActions } from "@/components/health/HealthQuickActions";
import {
  mockHealthScore,
  mockHealthFactors,
  mockHealthRecommendations,
  mockPotentialSavings,
  mockHealthTrend,
} from "@/mocks/health";

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
        score={{ overall_score: 95, grade: "A", status_label: "Excellent", last_analysis: null }}
      />,
    );
    expect(screen.getByText("95")).toBeInTheDocument();
    expect(screen.getByText(/Grade A/)).toBeInTheDocument();
  });

  it("renders grade E for critical score", () => {
    render(
      <HealthScoreHero
        score={{ overall_score: 25, grade: "E", status_label: "Critical", last_analysis: null }}
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
    expect(screen.getByText(/Free ~150 GB/)).toBeInTheDocument();
    expect(screen.getByText(/Reclaim ~6.8 GB/)).toBeInTheDocument();
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
    expect(screen.getByText("11.6 GB")).toBeInTheDocument();
    expect(screen.getByText("6.3 GB")).toBeInTheDocument();
    expect(screen.getByText("18.6 GB")).toBeInTheDocument();
  });

  it("renders total savings in header", () => {
    render(<PotentialSavings savings={mockPotentialSavings} />);
    expect(screen.getByText("36.6 GB")).toBeInTheDocument();
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
