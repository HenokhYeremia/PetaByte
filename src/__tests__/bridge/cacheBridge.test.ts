import { describe, it, expect, vi, beforeEach } from "vitest";
import { scanCacheTauri, cleanCacheTauri, cacheTotalSizeTauri, computePreview } from "@/bridge/cache";
import { resetTauriCheck } from "@/bridge/tauriCheck";
import type { CacheCategory } from "@/types";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const mockEntries = [
  { path: "/cache/system/a.log", category: "System", size_bytes: 2000, file_count: 1, last_accessed: null },
  { path: "/cache/system/b.log", category: "System", size_bytes: 3000, file_count: 1, last_accessed: null },
  { path: "/cache/browser/cookie.db", category: "Browser", size_bytes: 5000, file_count: 3, last_accessed: null },
];

const mockCategory: CacheCategory = {
  id: "cat-1",
  name: "browser",
  display_name: "Browser Cache",
  icon: "globe",
  risk_level: "safe",
  total_size: 5000,
  file_count: 2,
  entries: [
    { id: "e-1", path: "/cache/a", name: "a.cache", size: 2000, matched_rule: "*", category_id: "cat-1", safety_status: "safe", selected: false },
    { id: "e-2", path: "/cache/b", name: "b.cache", size: 3000, matched_rule: "*", category_id: "cat-1", safety_status: "safe", selected: false },
  ],
};

describe("cacheBridge", () => {
  beforeEach(() => {
    resetTauriCheck();
    delete (window as any).__TAURI__;
  });

  describe("scanCacheTauri", () => {
    it("returns cache data from invoke", async () => {
      const { invoke } = await import("@tauri-apps/api/core");
      vi.mocked(invoke).mockResolvedValue(JSON.stringify(mockEntries));
      const result = await scanCacheTauri();
      expect(Array.isArray(result.categories)).toBe(true);
      expect(result.summary).toBeDefined();
      expect(result.categories.length).toBeGreaterThanOrEqual(1);
    });

    it("returns categories with entries unselected by default", async () => {
      const { invoke } = await import("@tauri-apps/api/core");
      vi.mocked(invoke).mockResolvedValue(JSON.stringify(mockEntries));
      const result = await scanCacheTauri();
      for (const cat of result.categories) {
        for (const entry of cat.entries) {
          expect(entry.selected).toBe(false);
        }
      }
    });
  });

  describe("cleanCacheTauri", () => {
    it("calls invoke to clean cache", async () => {
      const { invoke } = await import("@tauri-apps/api/core");
      vi.mocked(invoke).mockResolvedValue(undefined);
      await expect(cleanCacheTauri()).resolves.toBeUndefined();
      expect(invoke).toHaveBeenCalledWith("clean_cache");
    });
  });

  describe("cacheTotalSizeTauri", () => {
    it("returns cache size from invoke", async () => {
      const { invoke } = await import("@tauri-apps/api/core");
      vi.mocked(invoke).mockResolvedValue("5000");
      const size = await cacheTotalSizeTauri();
      expect(typeof size).toBe("number");
      expect(size).toBe(5000);
    });
  });

  describe("computePreview", () => {
    it("returns a preview object from categories", () => {
      const preview = computePreview([mockCategory]);
      expect(preview).toBeDefined();
      expect(preview).toHaveProperty("files_to_remove");
      expect(preview).toHaveProperty("estimated_savings");
      expect(preview).toHaveProperty("risk_level");
      expect(preview).toHaveProperty("items");
    });
  });
});
