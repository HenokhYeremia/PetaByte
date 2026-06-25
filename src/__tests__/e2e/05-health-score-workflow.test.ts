import { describe, it, expect, vi, beforeEach } from "vitest";
import { resetTauriCheck } from "@/bridge/tauriCheck";
import { useHealthStore } from "@/stores/healthStore";
import { globalEventBus, EventChannels } from "@/bridge/eventBus";
import type { HealthScore } from "@/types";
import type { HealthComplete } from "@/types/events";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const mockScore: HealthScore = {
  overall_score: 72, grade: "C", status_label: "Fair", last_analysis: null,
  factors: [
    { name: "free_space", label: "Free Space", score: 45, weight: 0.30, impact: 45, color: "red", icon: "hard-drive", description: "Only 12% free space" },
    { name: "duplicates", label: "Duplicates", score: 80, weight: 0.15, impact: 80, color: "yellow", icon: "copy", description: "5% wasted by duplicates" },
    { name: "temp_cache", label: "Temp/Cache", score: 70, weight: 0.15, impact: 70, color: "yellow", icon: "trash-2", description: "8% cache files" },
  ],
  recommendations: [
    { id: "r1", message: "Free up space — drive is critically full", category: "urgent", priority: "urgent", impact_estimate: "50 GB", action_label: "Clean Now" },
    { id: "r2", message: "Remove duplicate files", category: "duplicate", priority: "high", impact_estimate: "5 GB", action_label: "View Duplicates" },
  ],
  savings: { total: 55_000_000_000, duplicates: 5_000_000_000, cache: 50_000_000_000, large_files: 0, duplicate_savings: 5_000_000_000, cache_savings: 50_000_000_000, large_file_savings: 0 },
  trend: { one_day: 2, seven_days: -5, thirty_days: -12, ninety_days: -8, data_points: [], health: [], storage: [], savings: [] },
};

const mockRustDto = {
  overall_score: 72,
  factors: [
    { name: "free_space", score: 45, weight: 0.30, description: "Only 12% free space" },
    { name: "duplicates", score: 80, weight: 0.15, description: "5% wasted by duplicates" },
    { name: "temp_cache", score: 70, weight: 0.15, description: "8% cache files" },
  ],
  total_files: 50000,
  total_size_bytes: 500000000000,
  free_space_bytes: 60000000000,
  scanned_at: "2026-06-20T12:00:00Z",
};

describe("E2E: Health Score Workflow", () => {
  beforeEach(() => {
    useHealthStore.setState({
      score: null, factors: [], recommendations: [], savings: null, trend: null,
      status: "idle", loading: false, error: null,
    });
    resetTauriCheck();
    delete (window as any).__TAURI__;
    delete (window as any).__TAURI_INTERNALS__;
    globalEventBus.clearAll();
  });

  // 1. Analysis
  it("1.1 fetches health score from bridge and populates store", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockResolvedValue(JSON.stringify(mockRustDto));
    await useHealthStore.getState().fetchHealthData();
    const state = useHealthStore.getState();
    expect(state.loading).toBe(false);
    expect(state.status).toBe("ready");
    expect(state.score).not.toBeNull();
    expect(state.score!.overall_score).toBe(72);
    expect(state.score!.grade).toBe("C");
  });

  it("1.2 health progress events fire during analysis", () => {
    const progressSpy = vi.fn();
    globalEventBus.on(EventChannels.HEALTH_PROGRESS, progressSpy);
    globalEventBus.emit(EventChannels.HEALTH_PROGRESS, { analysis_progress: 25, factor_evaluation_progress: 0, current_factor: "free_space" });
    globalEventBus.emit(EventChannels.HEALTH_PROGRESS, { analysis_progress: 75, factor_evaluation_progress: 60, current_factor: "duplicates" });
    globalEventBus.emit(EventChannels.HEALTH_PROGRESS, { analysis_progress: 100, factor_evaluation_progress: 100, current_factor: "completed" });
    expect(progressSpy).toHaveBeenCalledTimes(3);
    expect(progressSpy.mock.calls[1][0].current_factor).toBe("duplicates");
    expect(progressSpy.mock.calls[2][0].analysis_progress).toBe(100);
  });

  it("1.3 health complete event fires with final score", () => {
    const completeSpy = vi.fn();
    globalEventBus.on(EventChannels.HEALTH_COMPLETE, completeSpy);
    const result: HealthComplete = { overall_score: 72, grade: "C" };
    globalEventBus.emit(EventChannels.HEALTH_COMPLETE, result);
    expect(completeSpy).toHaveBeenCalledWith(result);
    const last = globalEventBus.getLastPayload<HealthComplete>(EventChannels.HEALTH_COMPLETE);
    expect(last?.overall_score).toBe(72);
    expect(last?.grade).toBe("C");
  });

  // 2. Recommendation Generation
  it("2.1 recommendations are sorted by priority", () => {
    useHealthStore.setState({ recommendations: mockScore.recommendations });
    const recs = useHealthStore.getState().recommendations;
    expect(recs[0].priority).toBe("urgent");
    expect(recs[1].priority).toBe("high");
  });

  it("2.2 recommendations include impact estimates", () => {
    useHealthStore.setState({ recommendations: mockScore.recommendations });
    const recs = useHealthStore.getState().recommendations;
    expect(recs[0].impact_estimate).toBe("50 GB");
    expect(recs[1].impact_estimate).toBe("5 GB");
  });

  it("2.3 each recommendation has an action label", () => {
    useHealthStore.setState({ recommendations: mockScore.recommendations });
    for (const rec of useHealthStore.getState().recommendations) {
      expect(rec.action_label).toBeTruthy();
    }
  });

  // 3. UI Presentation
  it("3.1 score displays with grade and color mapping", () => {
    useHealthStore.setState({ score: mockScore });
    const s = useHealthStore.getState().score!;
    expect(s.overall_score).toBe(72);
    expect(s.grade).toBe("C");
    expect(s.status_label).toBe("Fair");
  });

  it("3.2 factor breakdown shows all factors with weights", () => {
    useHealthStore.setState({ factors: mockScore.factors });
    const factors = useHealthStore.getState().factors;
    expect(factors.length).toBe(3);
    expect(factors[0].name).toBe("free_space");
    expect(factors[0].weight).toBe(0.30);
    expect(factors[1].weight).toBe(0.15);
  });

  it("3.3 potential savings displays totals", () => {
    useHealthStore.setState({ savings: mockScore.savings });
    const savings = useHealthStore.getState().savings!;
    expect(savings.total).toBe(55_000_000_000);
    expect(savings.duplicates).toBe(5_000_000_000);
    expect(savings.cache).toBe(50_000_000_000);
  });

  it("3.4 trend data shows deltas", () => {
    useHealthStore.setState({ trend: mockScore.trend });
    const trend = useHealthStore.getState().trend!;
    expect(trend.one_day).toBe(2);
    expect(trend.seven_days).toBe(-5);
    expect(trend.thirty_days).toBe(-12);
  });

  it("3.5 reset clears all health state", () => {
    useHealthStore.setState({ score: mockScore, factors: mockScore.factors, recommendations: mockScore.recommendations, status: "ready" });
    useHealthStore.getState().reset();
    const state = useHealthStore.getState();
    expect(state.score).toBeNull();
    expect(state.factors).toEqual([]);
    expect(state.recommendations).toEqual([]);
    expect(state.status).toBe("idle");
  });

  it("3.6 fetch error sets error state", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockRejectedValue(new Error("Volume not found"));
    await useHealthStore.getState().fetchHealthData();
    const state = useHealthStore.getState();
    expect(state.loading).toBe(false);
    expect(state.error).toContain("Volume not found");
    expect(state.score).toBeNull();
  });
});
