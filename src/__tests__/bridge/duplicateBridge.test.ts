import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchDuplicates } from "@/bridge/duplicates";
import { resetTauriCheck } from "@/bridge/tauriCheck";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const mockRustDto = {
  total_groups: 1,
  total_duplicate_files: 2,
  total_wasted_bytes: 1024,
  total_unique_size: 1024,
  largest_group_size: 1024,
  largest_group_wasted: 1024,
  groups: [
    {
      group_id: "group-1",
      file_size: 1024,
      file_count: 2,
      total_wasted_bytes: 1024,
      members: [
        { file_path: "/a.txt", file_name: "a.txt", file_size: 1024 },
        { file_path: "/b.txt", file_name: "b.txt", file_size: 1024 },
      ],
    },
  ],
  partial_hashed: 0,
  full_hashed: 2,
  hash_cache_hits: 0,
  hash_cache_misses: 2,
};

describe("duplicateBridge", () => {
  beforeEach(() => {
    resetTauriCheck();
    delete (window as any).__TAURI__;
  });

  describe("fetchDuplicates", () => {
    it("returns duplicate data from invoke", async () => {
      const { invoke } = await import("@tauri-apps/api/core");
      vi.mocked(invoke).mockResolvedValue(JSON.stringify(mockRustDto));
      const result = await fetchDuplicates();
      expect(Array.isArray(result.groups)).toBe(true);
      expect(result.summary).toBeDefined();
      expect(result.groups.length).toBe(1);
      expect(result.summary.total_groups).toBe(1);
    });

    it("returns groups with expected shape", async () => {
      const { invoke } = await import("@tauri-apps/api/core");
      vi.mocked(invoke).mockResolvedValue(JSON.stringify(mockRustDto));
      const result = await fetchDuplicates();
      const group = result.groups[0];
      expect(group).toHaveProperty("id");
      expect(group).toHaveProperty("file_size");
      expect(group).toHaveProperty("files");
      expect(Array.isArray(group.files)).toBe(true);
    });
  });
});
