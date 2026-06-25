import { create } from "zustand";
import type { AppSettingsData, GeneralSettings, ScannerSettings, DuplicateSettings, MoveSettings, CacheCleanerSettings, HealthScoreSettings, AppSettings } from "@/types";

type SettingsStatus = "idle" | "saving" | "saved" | "error";

interface SettingsStore {
  settings: AppSettingsData;
  originalSettings: AppSettingsData;
  status: SettingsStatus;
  loading: boolean;
  error: string | null;
  dirty: boolean;

  updateGeneral: (partial: Partial<GeneralSettings>) => void;
  updateScanner: (partial: Partial<ScannerSettings>) => void;
  updateDuplicate: (partial: Partial<DuplicateSettings>) => void;
  updateMove: (partial: Partial<MoveSettings>) => void;
  updateCacheCleaner: (partial: Partial<CacheCleanerSettings>) => void;
  updateHealthScore: (partial: Partial<HealthScoreSettings>) => void;
  updateApp: (partial: Partial<AppSettings>) => void;

  save: () => Promise<void>;
  reset: () => void;
  discard: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const DEFAULT_SETTINGS: AppSettingsData = {
  general: { language: "en", theme: "dark", startup_behavior: "remember_last" },
  scanner: {
    default_scan_location: "", ignore_rules: ["**/node_modules/**", "**/.git/**", "**/target/**", "**/__pycache__/**", "**/.next/**", "**/.DS_Store"],
    max_depth: null, follow_symlinks: false, thread_count: 4, min_file_size: null, max_file_size: null,
  },
  duplicate: { hash_strategy: "tiered", min_group_size: 2, verify_on_move: true, verify_on_delete: true },
  move: { default_destination: "", conflict_strategy: "ask", undo_retention_days: 30 },
  cache_cleaner: { enabled_categories: ["browser", "developer", "temporary", "package_manager"], min_safety_level: "safe", dry_run_by_default: true, cleanup_rules_path: "" },
  health_score: { scoring_sensitivity: "medium", show_anomalies: true, auto_analyze: true, recommendation_count: 5 },
  app: { log_level: "info", log_retention_days: 30, enable_diagnostics: true, auto_export: false, settings_file_path: "" },
};

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

async function saveSettingsToBackend(settings: AppSettingsData): Promise<void> {
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("save_settings", { settings: JSON.stringify(settings) });
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: deepClone(DEFAULT_SETTINGS),
  originalSettings: deepClone(DEFAULT_SETTINGS),
  status: "idle",
  loading: false,
  error: null,
  dirty: false,

  updateGeneral: (partial) => set((s) => ({ settings: { ...s.settings, general: { ...s.settings.general, ...partial } }, dirty: true, status: "idle", error: null })),
  updateScanner: (partial) => set((s) => ({ settings: { ...s.settings, scanner: { ...s.settings.scanner, ...partial } }, dirty: true, status: "idle", error: null })),
  updateDuplicate: (partial) => set((s) => ({ settings: { ...s.settings, duplicate: { ...s.settings.duplicate, ...partial } }, dirty: true, status: "idle", error: null })),
  updateMove: (partial) => set((s) => ({ settings: { ...s.settings, move: { ...s.settings.move, ...partial } }, dirty: true, status: "idle", error: null })),
  updateCacheCleaner: (partial) => set((s) => ({ settings: { ...s.settings, cache_cleaner: { ...s.settings.cache_cleaner, ...partial } }, dirty: true, status: "idle", error: null })),
  updateHealthScore: (partial) => set((s) => ({ settings: { ...s.settings, health_score: { ...s.settings.health_score, ...partial } }, dirty: true, status: "idle", error: null })),
  updateApp: (partial) => set((s) => ({ settings: { ...s.settings, app: { ...s.settings.app, ...partial } }, dirty: true, status: "idle", error: null })),

  save: async () => {
    set({ status: "saving" });
    try {
      await saveSettingsToBackend(get().settings);
      set({ status: "saved", originalSettings: deepClone(get().settings), dirty: false });
    } catch (err) {
      set({ status: "error", error: String(err) });
    }
  },
  reset: () => set({ settings: deepClone(DEFAULT_SETTINGS), originalSettings: deepClone(DEFAULT_SETTINGS), status: "idle", dirty: false, error: null }),
  discard: () => set((s) => ({ settings: deepClone(s.originalSettings), dirty: false, status: "idle", error: null })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, status: "error" }),
}));
