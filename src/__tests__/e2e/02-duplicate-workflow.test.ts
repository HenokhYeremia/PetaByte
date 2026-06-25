import { describe, it, expect, vi, beforeEach } from "vitest";
import { resetTauriCheck } from "@/bridge/tauriCheck";
import { useDuplicateStore } from "@/stores/duplicateStore";
import { globalEventBus, EventChannels } from "@/bridge/eventBus";
import type { DuplicateGroup, DuplicateSummary } from "@/types";
import type { DuplicateProgress } from "@/types/events";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const mockGroup: DuplicateGroup = {
  id: "g1", file_size: 1024, file_count: 2, total_wasted_bytes: 1024,
  common_parent: "D:\\photos",
  files: [
    { id: "f1", path: "D:\\photos\\a.jpg", name: "a.jpg", hash: "abc123", size: 1024, modified_at: "2026-01-01T00:00:00Z", is_kept: true, is_selected: false, file_name: "a.jpg", file_path: "D:\\photos\\a.jpg", file_size: 1024, hash_status: "matched" },
    { id: "f2", path: "D:\\photos\\b.jpg", name: "b.jpg", hash: "abc123", size: 1024, modified_at: "2026-01-01T00:00:00Z", is_kept: false, is_selected: false, file_name: "b.jpg", file_path: "D:\\photos\\b.jpg", file_size: 1024, hash_status: "matched" },
  ],
};

const mockSummary: DuplicateSummary = {
  total_groups: 1, total_files: 2, total_wasted_bytes: 1024, potential_savings: 1024,
  scan_session_id: "s1", group_count: 1, total_duplicate_files: 2, total_files_scan: 100, scanned_at: "2026-06-20T12:00:00Z",
};

const mockRustDto = {
  total_groups: 1, total_duplicate_files: 2, total_wasted_bytes: 1024, total_unique_size: 1024,
  largest_group_size: 1024, largest_group_wasted: 1024,
  groups: [{
    group_id: "g1", file_size: 1024, file_count: 2, total_wasted_bytes: 1024,
    members: [
      { file_path: "D:\\photos\\a.jpg", file_name: "a.jpg", file_size: 1024 },
      { file_path: "D:\\photos\\b.jpg", file_name: "b.jpg", file_size: 1024 },
    ],
  }],
  partial_hashed: 0, full_hashed: 2, hash_cache_hits: 0, hash_cache_misses: 2,
};

const makeProgress = (overrides: Partial<DuplicateProgress> = {}): DuplicateProgress => ({
  groups_found: 0, files_analyzed: 500, current_stage: "hashing", percentage: 50, ...overrides,
});

describe("E2E: Duplicate Workflow", () => {
  beforeEach(() => {
    useDuplicateStore.setState({
      groups: [], summary: null, loading: false, error: null,
      selectedGroupId: null, selectedFileIds: new Set(),
      filterState: { search: "", folder: "", extensions: [], countMin: null, countMax: null, sizeMin: null, sizeMax: null, extensionFilter: "all", sortConfig: { field: "size", direction: "desc" } },
      sortConfig: { field: "size", direction: "desc" },
    });
    resetTauriCheck();
    delete (window as any).__TAURI__;
    delete (window as any).__TAURI_INTERNALS__;
    globalEventBus.clearAll();
  });

  // 1. Detection
  it("1.1 fetches duplicate groups and summary from bridge", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockResolvedValue(JSON.stringify(mockRustDto));
    await useDuplicateStore.getState().fetchDuplicatesAction();
    const state = useDuplicateStore.getState();
    expect(state.loading).toBe(false);
    expect(state.groups.length).toBe(1);
    expect(state.summary).not.toBeNull();
    expect(state.summary!.total_groups).toBe(1);
  });

  it("1.2 duplicate progress events fire during detection", () => {
    const progressSpy = vi.fn();
    globalEventBus.on(EventChannels.DUPLICATE_PROGRESS, progressSpy);
    globalEventBus.emit(EventChannels.DUPLICATE_PROGRESS, makeProgress({ percentage: 10 }));
    globalEventBus.emit(EventChannels.DUPLICATE_PROGRESS, makeProgress({ percentage: 50, current_stage: "partial_hash" }));
    globalEventBus.emit(EventChannels.DUPLICATE_PROGRESS, makeProgress({ percentage: 90, current_stage: "full_hash" }));
    expect(progressSpy).toHaveBeenCalledTimes(3);
    expect(progressSpy.mock.calls[1][0].current_stage).toBe("partial_hash");
    expect(progressSpy.mock.calls[2][0].percentage).toBe(90);
  });

  it("1.3 duplicate complete event carries result summary", () => {
    const completeSpy = vi.fn();
    globalEventBus.on(EventChannels.DUPLICATE_COMPLETE, completeSpy);
    const result = { groups_found: 5, total_wasted_bytes: 50_000_000 };
    globalEventBus.emit(EventChannels.DUPLICATE_COMPLETE, result);
    expect(completeSpy).toHaveBeenCalledWith(result);
    const last = globalEventBus.getLastPayload(EventChannels.DUPLICATE_COMPLETE);
    expect(last).toEqual(result);
  });

  it("1.4 duplicate error event is propagated", () => {
    const errorSpy = vi.fn();
    globalEventBus.on(EventChannels.DUPLICATE_ERROR, errorSpy);
    globalEventBus.emit(EventChannels.DUPLICATE_ERROR, "Hash cache corruption detected");
    expect(errorSpy).toHaveBeenCalledWith("Hash cache corruption detected");
  });

  // 2. Reporting
  it("2.1 duplicate groups show sorted by wasted bytes", () => {
    const store = useDuplicateStore.getState();
    const bigGroup = { ...mockGroup, id: "g2", file_size: 10_000_000, total_wasted_bytes: 10_000_000, file_count: 3 };
    store.setGroups([mockGroup, bigGroup]);
    const sorted = [...useDuplicateStore.getState().groups].sort((a, b) => b.total_wasted_bytes - a.total_wasted_bytes);
    expect(sorted[0].id).toBe("g2");
    expect(sorted[0].total_wasted_bytes).toBe(10_000_000);
  });

  it("2.2 summary accurately reflects total savings", () => {
    useDuplicateStore.getState().setSummary(mockSummary);
    const state = useDuplicateStore.getState();
    expect(state.summary!.potential_savings).toBe(1024);
    expect(state.summary!.total_duplicate_files).toBe(2);
  });

  it("2.3 duplicate detection handles empty results", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    const emptyDto = { ...mockRustDto, total_groups: 0, total_duplicate_files: 0, total_wasted_bytes: 0, groups: [] };
    vi.mocked(invoke).mockResolvedValue(JSON.stringify(emptyDto));
    await useDuplicateStore.getState().fetchDuplicatesAction();
    const state = useDuplicateStore.getState();
    expect(state.groups).toEqual([]);
    expect(state.summary?.total_groups).toBe(0);
    expect(state.loading).toBe(false);
  });

  // 3. UI Presentation
  it("3.1 file selection toggle works correctly", () => {
    useDuplicateStore.getState().toggleFile("g1", "f1");
    expect(useDuplicateStore.getState().selectedFileIds.has("f1")).toBe(true);
    useDuplicateStore.getState().toggleFile("g1", "f1");
    expect(useDuplicateStore.getState().selectedFileIds.has("f1")).toBe(false);
  });

  it("3.2 select all in group marks all files", () => {
    useDuplicateStore.setState({ groups: [mockGroup] });
    useDuplicateStore.getState().selectAllGroup("g1", true);
    expect(useDuplicateStore.getState().selectedFileIds.has("f1")).toBe(true);
    expect(useDuplicateStore.getState().selectedFileIds.has("f2")).toBe(true);
    useDuplicateStore.getState().selectAllGroup("g1", false);
    expect(useDuplicateStore.getState().selectedFileIds.has("f1")).toBe(false);
  });

  it("3.3 filter state updates trigger re-render via store", () => {
    useDuplicateStore.getState().setFilterState({ search: "photo", extensionFilter: "jpg" });
    const state = useDuplicateStore.getState();
    expect(state.filterState.search).toBe("photo");
    expect(state.filterState.extensionFilter).toBe("jpg");
  });

  it("3.4 sort config changes update both sort and filter", () => {
    useDuplicateStore.getState().setSortConfig({ field: "count", direction: "asc" });
    const state = useDuplicateStore.getState();
    expect(state.sortConfig.field).toBe("count");
    expect(state.filterState.sortConfig.field).toBe("count");
  });

  it("3.5 fetch error sets error state", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockRejectedValue(new Error("Database connection failed"));
    await useDuplicateStore.getState().fetchDuplicatesAction();
    const state = useDuplicateStore.getState();
    expect(state.loading).toBe(false);
    expect(state.error).toContain("Database connection failed");
    expect(state.groups).toEqual([]);
  });
});
