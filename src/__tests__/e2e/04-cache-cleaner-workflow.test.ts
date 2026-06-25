import { describe, it, expect, vi, beforeEach } from "vitest";
import { resetTauriCheck } from "@/bridge/tauriCheck";
import { useCleanerStore } from "@/stores/cleanerStore";
import { globalEventBus, EventChannels } from "@/bridge/eventBus";
import { computePreview } from "@/bridge/cache";
import type { CacheCategory } from "@/types";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const mockCategory: CacheCategory = {
  id: "cat-1", name: "browser", display_name: "Browser Cache", icon: "globe", risk_level: "safe",
  total_size: 5_000_000_000, file_count: 2,
  entries: [
    { id: "e-1", path: "D:\\cache\\chrome\\a.cache", name: "a.cache", size: 3_000_000_000, matched_rule: "*.cache", category_id: "cat-1", safety_status: "safe", selected: false },
    { id: "e-2", path: "D:\\cache\\chrome\\b.cache", name: "b.cache", size: 2_000_000_000, matched_rule: "*.cache", category_id: "cat-1", safety_status: "safe", selected: false },
  ],
};

const riskyCategory: CacheCategory = {
  ...mockCategory, id: "cat-2", name: "system", display_name: "System Cache", icon: "settings", risk_level: "risky", total_size: 500_000_000,
  entries: [
    { id: "e-3", path: "D:\\system\\temp\\sys.tmp", name: "sys.tmp", size: 500_000_000, matched_rule: "*.tmp", category_id: "cat-2", safety_status: "warning", selected: true },
  ],
};


const mockRustEntries = [
  { path: "D:\\cache\\chrome\\a.cache", category: "Browser", size_bytes: 3_000_000_000, file_count: 1, last_accessed: null },
  { path: "D:\\cache\\chrome\\b.cache", category: "Browser", size_bytes: 2_000_000_000, file_count: 1, last_accessed: null },
  { path: "D:\\system\\temp\\sys.tmp", category: "System", size_bytes: 500_000_000, file_count: 1, last_accessed: null },
];

describe("E2E: Cache Cleaner Workflow", () => {
  beforeEach(() => {
    useCleanerStore.setState({
      categories: [], summary: null, preview: null, status: "idle", loading: false, error: null,
      selectedCategoryId: null, filter: { search: "", categoryFilter: "all", safetyFilter: "all" },
    });
    resetTauriCheck();
    delete (window as any).__TAURI__;
    delete (window as any).__TAURI_INTERNALS__;
    globalEventBus.clearAll();
  });

  // 1. Analysis
  it("1.1 fetches cache categories and summary from bridge", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockResolvedValue(JSON.stringify(mockRustEntries));
    await useCleanerStore.getState().fetchCacheData();
    const state = useCleanerStore.getState();
    expect(state.loading).toBe(false);
    expect(state.status).toBe("ready");
    expect(state.categories.length).toBe(2);
    expect(state.summary).not.toBeNull();
  });

  it("1.2 categories correctly sorted by risk level and size", () => {
    useCleanerStore.setState({ categories: [mockCategory, riskyCategory] });
    const categories = useCleanerStore.getState().categories;
    const safe = categories.filter((c) => c.risk_level === "safe");
    const risky = categories.filter((c) => c.risk_level === "risky");
    expect(safe.length).toBe(1);
    expect(risky.length).toBe(1);
  });

  it("1.3 analysis handles empty cache results", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockResolvedValue(JSON.stringify([]));
    await useCleanerStore.getState().fetchCacheData();
    const state = useCleanerStore.getState();
    expect(state.categories).toEqual([]);
    expect(state.summary?.total_cache_size).toBe(0);
  });

  // 2. Preview
  it("2.1 preview computes files to remove and savings", () => {
    useCleanerStore.setState({ categories: [{
      ...mockCategory,
      entries: mockCategory.entries.map((e) => ({ ...e, selected: true })),
    }]});
    useCleanerStore.getState().previewCleanup();
    const state = useCleanerStore.getState();
    expect(state.preview).not.toBeNull();
    expect(state.preview!.files_to_remove).toBe(2);
    expect(state.preview!.estimated_savings).toBe(5_000_000_000);
    expect(state.status).toBe("previewing");
  });

  it("2.2 preview detects risky items and elevates risk level", () => {
    useCleanerStore.setState({ categories: [riskyCategory] });
    useCleanerStore.getState().previewCleanup();
    const state = useCleanerStore.getState();
    expect(state.preview!.risk_level).toBe("high");
  });

  it("2.3 cleanup preview shows per-item details", () => {
    const preview = computePreview([{
      ...mockCategory,
      entries: mockCategory.entries.map((e) => ({ ...e, selected: true })),
    }]);
    expect(preview.items.length).toBe(2);
    expect(preview.items[0].path).toContain("a.cache");
    expect(preview.items[0].safe).toBe(true);
  });

  it("2.4 partial selection affects preview", () => {
    useCleanerStore.setState({ categories: [{
      ...mockCategory,
      entries: [
        { ...mockCategory.entries[0], selected: true },
        { ...mockCategory.entries[1], selected: false },
      ],
    }]});
    useCleanerStore.getState().previewCleanup();
    expect(useCleanerStore.getState().preview!.files_to_remove).toBe(1);
    expect(useCleanerStore.getState().preview!.estimated_savings).toBe(3_000_000_000);
  });

  // 3. Cleanup
  it("3.1 executes cleanup and transitions to completed", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockResolvedValue(undefined);
    await useCleanerStore.getState().startCleanupAction();
    const state = useCleanerStore.getState();
    expect(state.status).toBe("completed");
  });

  it("3.2 cleanup progress events fire", () => {
    const progressSpy = vi.fn();
    globalEventBus.on(EventChannels.CACHE_PROGRESS, progressSpy);
    globalEventBus.emit(EventChannels.CACHE_PROGRESS, { items_processed: 1, space_recovered: 3_000_000_000, status: "cleaning", total_items: 2 });
    globalEventBus.emit(EventChannels.CACHE_PROGRESS, { items_processed: 2, space_recovered: 5_000_000_000, status: "completed", total_items: 2 });
    expect(progressSpy).toHaveBeenCalledTimes(2);
    expect(progressSpy.mock.calls[1][0].space_recovered).toBe(5_000_000_000);
  });

  it("3.3 cleanup failure sets failed status", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockRejectedValue(new Error("File in use: cache.dat"));
    await useCleanerStore.getState().startCleanupAction();
    const state = useCleanerStore.getState();
    expect(state.status).toBe("failed");
    expect(state.error).toContain("File in use");
  });

  it("3.4 selectAll toggles all entries", () => {
    useCleanerStore.setState({ categories: [mockCategory] });
    useCleanerStore.getState().selectAll(true);
    expect(useCleanerStore.getState().categories[0].entries.every((e) => e.selected)).toBe(true);
    useCleanerStore.getState().selectAll(false);
    expect(useCleanerStore.getState().categories[0].entries.every((e) => e.selected)).toBe(false);
  });

  it("3.5 toggle individual entry", () => {
    useCleanerStore.setState({ categories: [mockCategory] });
    useCleanerStore.getState().toggleEntry("e-1", true);
    expect(useCleanerStore.getState().categories[0].entries[0].selected).toBe(true);
    useCleanerStore.getState().toggleEntry("e-1", false);
    expect(useCleanerStore.getState().categories[0].entries[0].selected).toBe(false);
  });

  it("3.6 fetch error sets error state", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockRejectedValue(new Error("Scan failed"));
    await useCleanerStore.getState().fetchCacheData();
    const state = useCleanerStore.getState();
    expect(state.error).toContain("Scan failed");
    expect(state.loading).toBe(false);
  });
});
