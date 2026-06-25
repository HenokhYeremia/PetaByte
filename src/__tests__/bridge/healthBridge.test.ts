import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchHealthScore, fetchHealthRecommendations } from "@/bridge/health";
import { resetTauriCheck } from "@/bridge/tauriCheck";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const mockRustDto = {
  overall_score: 85,
  factors: [
    { name: "duplicates", score: 0.8, weight: 0.3, description: "Test factor" },
    { name: "storage", score: 0.9, weight: 0.2, description: "Storage usage" },
  ],
  total_files: 1000,
  total_size_bytes: 500000000,
  free_space_bytes: 2000000000,
  scanned_at: "2024-01-01T00:00:00Z",
};

describe("healthBridge", () => {
  beforeEach(() => {
    resetTauriCheck();
    delete (window as any).__TAURI__;
  });

  describe("fetchHealthScore", () => {
    it("returns health data from invoke", async () => {
      const { invoke } = await import("@tauri-apps/api/core");
      vi.mocked(invoke).mockResolvedValue(JSON.stringify(mockRustDto));
      const result = await fetchHealthScore();
      expect(result.score.overall_score).toBe(85);
      expect(result.factors.length).toBeGreaterThan(0);
      expect(result.recommendations).toEqual([]);
      expect(result.savings).toBeDefined();
      expect(result.trend).toBeDefined();
    });

    it("returns data with correct shape", async () => {
      const { invoke } = await import("@tauri-apps/api/core");
      vi.mocked(invoke).mockResolvedValue(JSON.stringify(mockRustDto));
      const result = await fetchHealthScore();
      expect(result.score).toHaveProperty("overall_score");
      expect(result.score).toHaveProperty("grade");
      expect(result.factors[0]).toHaveProperty("name");
      expect(result.factors[0]).toHaveProperty("score");
    });
  });

  describe("fetchHealthRecommendations", () => {
    it("returns recommendations from invoke", async () => {
      const { invoke } = await import("@tauri-apps/api/core");
      vi.mocked(invoke).mockResolvedValue(JSON.stringify([{ id: "rec-1", message: "Clean up", category: "duplicates", priority: "medium", impact_estimate: "500 MB", action_label: "Clean" }]));
      const recs = await fetchHealthRecommendations();
      expect(Array.isArray(recs)).toBe(true);
      expect(recs.length).toBe(1);
    });
  });
});
