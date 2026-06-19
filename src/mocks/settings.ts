export interface MockGeneralSettings {
  language: string;
  theme: "light" | "dark" | "system";
  startup_behavior: "remember_last" | "open_scanner" | "open_dashboard" | "stay_idle";
}

export interface MockScannerSettings {
  default_scan_location: string;
  ignore_rules: string[];
  max_depth: number | null;
  follow_symlinks: boolean;
  thread_count: number;
  min_file_size: number | null;
  max_file_size: number | null;
}

export interface MockDuplicateSettings {
  hash_strategy: "tiered" | "full";
  min_group_size: number;
  verify_on_move: boolean;
  verify_on_delete: boolean;
}

export interface MockMoveSettings {
  default_destination: string;
  conflict_strategy: "ask" | "overwrite" | "skip" | "rename";
  undo_retention_days: number;
}

export interface MockCacheCleanerSettings {
  enabled_categories: string[];
  min_safety_level: "safe" | "moderate" | "risky";
  dry_run_by_default: boolean;
  cleanup_rules_path: string;
}

export interface MockHealthScoreSettings {
  scoring_sensitivity: "low" | "medium" | "high";
  show_anomalies: boolean;
  auto_analyze: boolean;
  recommendation_count: number;
}

export interface MockAppSettings {
  log_level: "debug" | "info" | "warn" | "error";
  log_retention_days: number;
  enable_diagnostics: boolean;
  auto_export: boolean;
  settings_file_path: string;
}

export interface MockSettings {
  general: MockGeneralSettings;
  scanner: MockScannerSettings;
  duplicate: MockDuplicateSettings;
  move: MockMoveSettings;
  cache_cleaner: MockCacheCleanerSettings;
  health_score: MockHealthScoreSettings;
  app: MockAppSettings;
}

export const defaultGeneralSettings: MockGeneralSettings = {
  language: "en",
  theme: "dark",
  startup_behavior: "remember_last",
};

export const defaultScannerSettings: MockScannerSettings = {
  default_scan_location: "C:\\Users\\Lenovo",
  ignore_rules: [
    "**/node_modules/**",
    "**/.git/**",
    "**/target/**",
    "**/__pycache__/**",
    "**/.next/**",
    "C:\\Windows\\*",
    "**/.DS_Store",
  ],
  max_depth: null,
  follow_symlinks: false,
  thread_count: 4,
  min_file_size: null,
  max_file_size: null,
};

export const defaultDuplicateSettings: MockDuplicateSettings = {
  hash_strategy: "tiered",
  min_group_size: 2,
  verify_on_move: true,
  verify_on_delete: true,
};

export const defaultMoveSettings: MockMoveSettings = {
  default_destination: "D:\\PetaByte\\MovedFiles",
  conflict_strategy: "ask",
  undo_retention_days: 30,
};

export const defaultCacheCleanerSettings: MockCacheCleanerSettings = {
  enabled_categories: ["browser", "developer", "temporary", "package_manager"],
  min_safety_level: "safe",
  dry_run_by_default: true,
  cleanup_rules_path: "C:\\Users\\Lenovo\\.petabyte\\rules",
};

export const defaultHealthScoreSettings: MockHealthScoreSettings = {
  scoring_sensitivity: "medium",
  show_anomalies: true,
  auto_analyze: true,
  recommendation_count: 5,
};

export const defaultAppSettings: MockAppSettings = {
  log_level: "info",
  log_retention_days: 30,
  enable_diagnostics: true,
  auto_export: false,
  settings_file_path: "C:\\Users\\Lenovo\\.petabyte\\settings.json",
};

export const mockSettings: MockSettings = {
  general: { ...defaultGeneralSettings },
  scanner: { ...defaultScannerSettings },
  duplicate: { ...defaultDuplicateSettings },
  move: { ...defaultMoveSettings },
  cache_cleaner: { ...defaultCacheCleanerSettings },
  health_score: { ...defaultHealthScoreSettings },
  app: { ...defaultAppSettings },
};
