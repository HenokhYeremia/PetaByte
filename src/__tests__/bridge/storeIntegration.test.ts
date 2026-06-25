import { describe, it, expect, vi, beforeEach } from "vitest";
import { useScanStore } from "@/stores/scanStore";
import { useDuplicateStore } from "@/stores/duplicateStore";
import { useCleanerStore } from "@/stores/cleanerStore";
import { useHealthStore } from "@/stores/healthStore";
import { useMoveStore } from "@/stores/moveStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { resetTauriCheck } from "@/bridge/tauriCheck";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

describe("store integration - scanStore", () => {
  beforeEach(() => {
    useScanStore.setState({
      status: "idle",
      currentProgress: null,
      scanResult: null,
      scanHistory: [],
    });
    resetTauriCheck();
    delete (window as any).__TAURI__;
  });

  it("initializes with idle status", () => {
    const state = useScanStore.getState();
    expect(state.status).toBe("idle");
    expect(state.currentProgress).toBeNull();
  });

  it("startScanAction sets scanning status and progress", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockResolvedValue(JSON.stringify({ session_id: "s1", total_files: 100, total_size: 5000, total_dirs: 10, total_errors: 0, elapsed_ms: 1000, status: "completed" }));
    const store = useScanStore.getState();
    store.setSelectedPath("D:\\test");
    await store.startScanAction("D:\\test");
    const state = useScanStore.getState();
    expect(state.status).toBe("completed");
    expect(state.scanResult).not.toBeNull();
  });

  it("cancelScanAction sets cancelled status", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockResolvedValue(JSON.stringify({ session_id: "s1", total_files: 100, total_size: 5000, total_dirs: 10, total_errors: 0, elapsed_ms: 1000, status: "completed" }));
    const store = useScanStore.getState();
    store.setSelectedPath("D:\\test");
    await store.startScanAction("D:\\test");
    await store.cancelScanAction();
    const state = useScanStore.getState();
    expect(state.status).toBe("cancelled");
  });

});

describe("store integration - duplicateStore", () => {
  beforeEach(() => {
    useDuplicateStore.setState({
      groups: [],
      summary: null,
      loading: false,
      error: null,
      selectedGroupId: null,
      selectedFileIds: new Set(),
    });
    resetTauriCheck();
    delete (window as any).__TAURI__;
  });

  it("fetches duplicate data via bridge", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockResolvedValue(JSON.stringify({
      total_groups: 1, total_duplicate_files: 2, total_wasted_bytes: 1024, total_unique_size: 1024,
      largest_group_size: 1024, largest_group_wasted: 1024,
      groups: [{
        group_id: "g1", file_size: 1024, file_count: 2, total_wasted_bytes: 1024,
        members: [
          { file_path: "/a.txt", file_name: "a.txt", file_size: 1024 },
          { file_path: "/b.txt", file_name: "b.txt", file_size: 1024 },
        ],
      }],
      partial_hashed: 0, full_hashed: 2, hash_cache_hits: 0, hash_cache_misses: 2,
    }));
    await useDuplicateStore.getState().fetchDuplicatesAction();
    const state = useDuplicateStore.getState();
    expect(state.groups.length).toBeGreaterThan(0);
    expect(state.summary).not.toBeNull();
    expect(state.loading).toBe(false);
  });

  it("toggles file selection", () => {
    const store = useDuplicateStore.getState();
    store.toggleFile("group-1", "file-1");
    expect(useDuplicateStore.getState().selectedFileIds.has("file-1")).toBe(true);
    store.toggleFile("group-1", "file-1");
    expect(useDuplicateStore.getState().selectedFileIds.has("file-1")).toBe(false);
  });
});

describe("store integration - cleanerStore", () => {
  beforeEach(() => {
    useCleanerStore.setState({
      categories: [],
      summary: null,
      preview: null,
      status: "idle",
      loading: false,
      error: null,
    });
    resetTauriCheck();
    delete (window as any).__TAURI__;
  });

  it("fetches cache data via bridge", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockResolvedValue(JSON.stringify([
      { path: "/cache/a", category: "Npm", size_bytes: 2000, file_count: 2, last_accessed: null },
      { path: "/cache/b", category: "Pip", size_bytes: 3000, file_count: 1, last_accessed: null },
    ]));
    await useCleanerStore.getState().fetchCacheData();
    const state = useCleanerStore.getState();
    expect(state.categories.length).toBeGreaterThan(0);
    expect(state.summary).not.toBeNull();
    expect(state.loading).toBe(false);
  });

  it("selects all entries", () => {
    useCleanerStore.setState({
      categories: [{
        id: "cat-1", name: "test", icon: "folder", display_name: "Test", risk_level: "safe" as const,
        total_size: 100, file_count: 2,
        entries: [
          { id: "e-1", path: "/a", name: "a.txt", size: 50, matched_rule: "*", category_id: "cat-1", safety_status: "safe" as const, selected: false },
          { id: "e-2", path: "/b", name: "b.txt", size: 50, matched_rule: "*", category_id: "cat-1", safety_status: "safe" as const, selected: false },
        ],
      }],
    });
    useCleanerStore.getState().selectAll(true);
    const state = useCleanerStore.getState();
    expect(state.categories[0].entries.every((e) => e.selected)).toBe(true);
  });

  it("previewCleanup computes preview from categories", () => {
    useCleanerStore.setState({
      categories: [{
        id: "cat-1", name: "test", icon: "folder", display_name: "Test", risk_level: "safe" as const,
        total_size: 100, file_count: 2,
        entries: [
          { id: "e-1", path: "/a", name: "a.txt", size: 50, matched_rule: "*", category_id: "cat-1", safety_status: "safe" as const, selected: true },
          { id: "e-2", path: "/b", name: "b.txt", size: 50, matched_rule: "*", category_id: "cat-1", safety_status: "safe" as const, selected: false },
        ],
      }],
    });
    useCleanerStore.getState().previewCleanup();
    const state = useCleanerStore.getState();
    expect(state.preview).not.toBeNull();
    expect(state.status).toBe("previewing");
  });
});

describe("store integration - healthStore", () => {
  beforeEach(() => {
    useHealthStore.setState({
      score: null,
      factors: [],
      recommendations: [],
      savings: null,
      trend: null,
      status: "idle",
      loading: false,
      error: null,
    });
    resetTauriCheck();
    delete (window as any).__TAURI__;
  });

  it("fetches health data via bridge", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockResolvedValue(JSON.stringify({
      overall_score: 85,
      factors: [{ name: "duplicates", score: 0.8, weight: 0.3, description: "Test factor" }],
      total_files: 1000,
      total_size_bytes: 500000000,
      free_space_bytes: 2000000000,
      scanned_at: "2024-01-01T00:00:00Z",
    }));
    await useHealthStore.getState().fetchHealthData();
    const state = useHealthStore.getState();
    expect(state.score).not.toBeNull();
    expect(state.factors.length).toBeGreaterThan(0);
    expect(state.status).toBe("ready");
    expect(state.loading).toBe(false);
  });

  it("reset clears all health state", () => {
    useHealthStore.getState().reset();
    const state = useHealthStore.getState();
    expect(state.score).toBeNull();
    expect(state.factors).toEqual([]);
    expect(state.status).toBe("idle");
  });
});

describe("store integration - moveStore", () => {
  beforeEach(() => {
    useMoveStore.setState({
      operations: [],
      status: "idle",
      loading: false,
      error: null,
      undoJournal: [],
    });
    resetTauriCheck();
    delete (window as any).__TAURI__;
  });

  it("fetchPreviewAction gets operations via bridge", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockResolvedValue({
      operation_id: "op-1",
      source_path: "/s",
      destination_path: "/d",
      file_size: 1024,
      status: "completed",
      error: null,
    });
    await useMoveStore.getState().fetchPreviewAction(["/source"], "/dest");
    const state = useMoveStore.getState();
    expect(state.status).toBe("ready");
    expect(state.operations.length).toBeGreaterThan(0);
    expect(state.loading).toBe(false);
  });

  it("fetchUndoJournalAction gets journal via bridge", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockResolvedValue(JSON.stringify([]));
    await useMoveStore.getState().fetchUndoJournalAction();
    const state = useMoveStore.getState();
    expect(Array.isArray(state.undoJournal)).toBe(true);
    expect(state.loading).toBe(false);
  });
});

describe("store integration - settingsStore", () => {
  const SETTINGS_DEFAULTS = {
    general: { language: "en", theme: "dark", startup_behavior: "remember_last" },
    scanner: {
      default_scan_location: "C:\\Users\\Lenovo", ignore_rules: ["**/node_modules/**", "**/.git/**", "**/target/**", "**/__pycache__/**", "**/.next/**", "C:\\Windows\\*", "**/.DS_Store"],
      max_depth: null, follow_symlinks: false, thread_count: 4, min_file_size: null, max_file_size: null,
    },
    duplicate: { hash_strategy: "tiered", min_group_size: 2, verify_on_move: true, verify_on_delete: true },
    move: { default_destination: "D:\\PetaByte\\MovedFiles", conflict_strategy: "ask", undo_retention_days: 30 },
    cache_cleaner: {
      enabled_categories: ["browser", "developer", "temporary", "package_manager"],
      min_safety_level: "safe", dry_run_by_default: true,
      cleanup_rules_path: "C:\\Users\\Lenovo\\.petabyte\\rules",
    },
    health_score: { scoring_sensitivity: "medium", show_anomalies: true, auto_analyze: true, recommendation_count: 5 },
    app: { log_level: "info", log_retention_days: 30, enable_diagnostics: true, auto_export: false, settings_file_path: "C:\\Users\\Lenovo\\.petabyte\\settings.json" },
  };

  beforeEach(() => {
    useSettingsStore.setState({
      dirty: false,
      status: "idle",
      error: null,
      settings: JSON.parse(JSON.stringify(SETTINGS_DEFAULTS)),
      originalSettings: JSON.parse(JSON.stringify(SETTINGS_DEFAULTS)),
    });
    resetTauriCheck();
    delete (window as any).__TAURI__;
  });

  it("updateGeneral sets dirty flag", () => {
    useSettingsStore.getState().updateGeneral({ language: "fr" });
    const state = useSettingsStore.getState();
    expect(state.settings.general.language).toBe("fr");
    expect(state.dirty).toBe(true);
  });

  it("save resolves without backend when Tauri is not available", async () => {
    useSettingsStore.getState().updateGeneral({ language: "fr" });
    await useSettingsStore.getState().save();
    const state = useSettingsStore.getState();
    expect(state.status).toBe("saved");
    expect(state.dirty).toBe(false);

    useSettingsStore.setState({
      settings: JSON.parse(JSON.stringify(SETTINGS_DEFAULTS)),
      originalSettings: JSON.parse(JSON.stringify(SETTINGS_DEFAULTS)),
    });
  });

  it("discard reverts to original settings", () => {
    useSettingsStore.getState().updateGeneral({ language: "fr" });
    useSettingsStore.getState().discard();
    const state = useSettingsStore.getState();
    expect(state.settings.general.language).toBe("en");
    expect(state.dirty).toBe(false);
  });

  it("reset restores defaults", () => {
    useSettingsStore.getState().updateGeneral({ language: "fr" });
    useSettingsStore.getState().reset();
    const state = useSettingsStore.getState();
    expect(state.settings.general.language).toBe("en");
    expect(state.dirty).toBe(false);
  });
});
