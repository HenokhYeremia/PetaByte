import { create } from "zustand";
import type {
  MockSettings,
  MockGeneralSettings,
  MockScannerSettings,
  MockDuplicateSettings,
  MockMoveSettings,
  MockCacheCleanerSettings,
  MockHealthScoreSettings,
  MockAppSettings,
} from "@/mocks/settings";

type SettingsStatus = "idle" | "saving" | "saved" | "error";

interface SettingsStore {
  settings: MockSettings;
  originalSettings: MockSettings;
  status: SettingsStatus;
  loading: boolean;
  error: string | null;
  dirty: boolean;

  updateGeneral: (partial: Partial<MockGeneralSettings>) => void;
  updateScanner: (partial: Partial<MockScannerSettings>) => void;
  updateDuplicate: (partial: Partial<MockDuplicateSettings>) => void;
  updateMove: (partial: Partial<MockMoveSettings>) => void;
  updateCacheCleaner: (partial: Partial<MockCacheCleanerSettings>) => void;
  updateHealthScore: (partial: Partial<MockHealthScoreSettings>) => void;
  updateApp: (partial: Partial<MockAppSettings>) => void;

  save: () => void;
  reset: () => void;
  discard: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: {
    general: { language: "en", theme: "dark", startup_behavior: "remember_last" },
    scanner: {
      default_scan_location: "C:\\Users\\Lenovo",
      ignore_rules: ["**/node_modules/**", "**/.git/**", "**/target/**", "**/__pycache__/**", "**/.next/**", "C:\\Windows\\*", "**/.DS_Store"],
      max_depth: null,
      follow_symlinks: false,
      thread_count: 4,
      min_file_size: null,
      max_file_size: null,
    },
    duplicate: { hash_strategy: "tiered", min_group_size: 2, verify_on_move: true, verify_on_delete: true },
    move: { default_destination: "D:\\PetaByte\\MovedFiles", conflict_strategy: "ask", undo_retention_days: 30 },
    cache_cleaner: { enabled_categories: ["browser", "developer", "temporary", "package_manager"], min_safety_level: "safe", dry_run_by_default: true, cleanup_rules_path: "C:\\Users\\Lenovo\\.petabyte\\rules" },
    health_score: { scoring_sensitivity: "medium", show_anomalies: true, auto_analyze: true, recommendation_count: 5 },
    app: { log_level: "info", log_retention_days: 30, enable_diagnostics: true, auto_export: false, settings_file_path: "C:\\Users\\Lenovo\\.petabyte\\settings.json" },
  },
  originalSettings: {
    general: { language: "en", theme: "dark", startup_behavior: "remember_last" },
    scanner: {
      default_scan_location: "C:\\Users\\Lenovo",
      ignore_rules: ["**/node_modules/**", "**/.git/**", "**/target/**", "**/__pycache__/**", "**/.next/**", "C:\\Windows\\*", "**/.DS_Store"],
      max_depth: null,
      follow_symlinks: false,
      thread_count: 4,
      min_file_size: null,
      max_file_size: null,
    },
    duplicate: { hash_strategy: "tiered", min_group_size: 2, verify_on_move: true, verify_on_delete: true },
    move: { default_destination: "D:\\PetaByte\\MovedFiles", conflict_strategy: "ask", undo_retention_days: 30 },
    cache_cleaner: { enabled_categories: ["browser", "developer", "temporary", "package_manager"], min_safety_level: "safe", dry_run_by_default: true, cleanup_rules_path: "C:\\Users\\Lenovo\\.petabyte\\rules" },
    health_score: { scoring_sensitivity: "medium", show_anomalies: true, auto_analyze: true, recommendation_count: 5 },
    app: { log_level: "info", log_retention_days: 30, enable_diagnostics: true, auto_export: false, settings_file_path: "C:\\Users\\Lenovo\\.petabyte\\settings.json" },
  },
  status: "idle",
  loading: false,
  error: null,
  dirty: false,

  updateGeneral: (partial) =>
    set((s) => ({ settings: { ...s.settings, general: { ...s.settings.general, ...partial } }, dirty: true, status: "idle", error: null })),
  updateScanner: (partial) =>
    set((s) => ({ settings: { ...s.settings, scanner: { ...s.settings.scanner, ...partial } }, dirty: true, status: "idle", error: null })),
  updateDuplicate: (partial) =>
    set((s) => ({ settings: { ...s.settings, duplicate: { ...s.settings.duplicate, ...partial } }, dirty: true, status: "idle", error: null })),
  updateMove: (partial) =>
    set((s) => ({ settings: { ...s.settings, move: { ...s.settings.move, ...partial } }, dirty: true, status: "idle", error: null })),
  updateCacheCleaner: (partial) =>
    set((s) => ({ settings: { ...s.settings, cache_cleaner: { ...s.settings.cache_cleaner, ...partial } }, dirty: true, status: "idle", error: null })),
  updateHealthScore: (partial) =>
    set((s) => ({ settings: { ...s.settings, health_score: { ...s.settings.health_score, ...partial } }, dirty: true, status: "idle", error: null })),
  updateApp: (partial) =>
    set((s) => ({ settings: { ...s.settings, app: { ...s.settings.app, ...partial } }, dirty: true, status: "idle", error: null })),

  save: () => {
    set({ status: "saving" });
    setTimeout(() => {
      set({ status: "saved", originalSettings: { ...get().settings }, dirty: false });
    }, 300);
  },
  reset: () =>
    set({
      settings: {
        general: { language: "en", theme: "dark", startup_behavior: "remember_last" },
        scanner: {
          default_scan_location: "C:\\Users\\Lenovo",
          ignore_rules: ["**/node_modules/**", "**/.git/**", "**/target/**", "**/__pycache__/**", "**/.next/**", "C:\\Windows\\*", "**/.DS_Store"],
          max_depth: null,
          follow_symlinks: false,
          thread_count: 4,
          min_file_size: null,
          max_file_size: null,
        },
        duplicate: { hash_strategy: "tiered", min_group_size: 2, verify_on_move: true, verify_on_delete: true },
        move: { default_destination: "D:\\PetaByte\\MovedFiles", conflict_strategy: "ask", undo_retention_days: 30 },
        cache_cleaner: { enabled_categories: ["browser", "developer", "temporary", "package_manager"], min_safety_level: "safe", dry_run_by_default: true, cleanup_rules_path: "C:\\Users\\Lenovo\\.petabyte\\rules" },
        health_score: { scoring_sensitivity: "medium", show_anomalies: true, auto_analyze: true, recommendation_count: 5 },
        app: { log_level: "info", log_retention_days: 30, enable_diagnostics: true, auto_export: false, settings_file_path: "C:\\Users\\Lenovo\\.petabyte\\settings.json" },
      },
      originalSettings: {
        general: { language: "en", theme: "dark", startup_behavior: "remember_last" },
        scanner: {
          default_scan_location: "C:\\Users\\Lenovo",
          ignore_rules: ["**/node_modules/**", "**/.git/**", "**/target/**", "**/__pycache__/**", "**/.next/**", "C:\\Windows\\*", "**/.DS_Store"],
          max_depth: null,
          follow_symlinks: false,
          thread_count: 4,
          min_file_size: null,
          max_file_size: null,
        },
        duplicate: { hash_strategy: "tiered", min_group_size: 2, verify_on_move: true, verify_on_delete: true },
        move: { default_destination: "D:\\PetaByte\\MovedFiles", conflict_strategy: "ask", undo_retention_days: 30 },
        cache_cleaner: { enabled_categories: ["browser", "developer", "temporary", "package_manager"], min_safety_level: "safe", dry_run_by_default: true, cleanup_rules_path: "C:\\Users\\Lenovo\\.petabyte\\rules" },
        health_score: { scoring_sensitivity: "medium", show_anomalies: true, auto_analyze: true, recommendation_count: 5 },
        app: { log_level: "info", log_retention_days: 30, enable_diagnostics: true, auto_export: false, settings_file_path: "C:\\Users\\Lenovo\\.petabyte\\settings.json" },
      },
      status: "idle", dirty: false, error: null,
    }),
  discard: () =>
    set((s) => ({ settings: { ...s.originalSettings }, dirty: false, status: "idle", error: null })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, status: "error" }),
}));
