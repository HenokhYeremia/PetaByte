// ============================================================
// PetaByte Domain Types — mirror Rust workspace DTOs
// Field names match frontend component expectations.
// ============================================================

// ── General ────────────────────────────────────────────────

export interface FileEntry {
  id: string;
  path: string;
  name: string;
  size: number;
  is_directory: boolean;
  extension: string | null;
  modified_at: string;
  created_at: string;
  depth: number;
}

export interface ScanSession {
  id: string;
  volume_id: string;
  status: "pending" | "scanning" | "completed" | "cancelled" | "failed";
  total_files: number;
  total_size: number;
  scanned_files: number;
  started_at: string;
  completed_at: string | null;
}

// ── Scanner ────────────────────────────────────────────────

export interface Drive {
  letter: string;
  mount_point: string;
  label: string;
  total_bytes: number;
  free_bytes: number;
  is_removable: boolean;
  file_system: string;
}

export interface IgnoreRule {
  id: string;
  pattern: string;
  label: string;
  enabled: boolean;
  is_system: boolean;
  description: string;
  builtin: boolean;
}

export interface ScanConfig {
  path?: string;
  recursive: boolean;
  follow_symlinks: boolean;
  thread_count: number;
  max_depth: number | null;
  min_file_size: number | null;
  max_file_size: number | null;
  exclude_system_dirs: boolean;
}

export interface ScanProgress {
  session_id: string;
  scanned_files: number;
  total_files: number;
  scanned_size: number;
  total_size: number;
  current_path: string;
  elapsed_secs: number;
  eta_secs: number;
  status: string;
  total_directories: number;
  speed_files_per_sec: number;
  errors: number;
}

export interface ScanResult {
  id: string;
  volume_id: string;
  status: string;
  total_files: number;
  total_dirs: number;
  total_size: number;
  scanned_files: number;
  scanned_size: number;
  errors_count: number;
  duration_secs: number;
  started_at: string;
  completed_at: string | null;
  path: string;
  total_directories: number;
  errors: number;
}

export interface HistoryItem {
  id: string;
  path: string;
  total_files: number;
  total_size: number;
  status: string;
  started_at: string;
  completed_at: string | null;
  total_directories: number;
  duration_secs: number;
}

export type ScanStatus = "idle" | "scanning" | "paused" | "completed" | "cancelled" | "failed";

// ── Duplicates ─────────────────────────────────────────────

export interface DuplicateFile {
  id: string;
  path: string;
  name: string;
  hash: string;
  size: number;
  modified_at: string;
  is_kept: boolean;
  is_selected: boolean;
  file_name: string;
  file_path: string;
  file_size: number;
  hash_status: string;
}

export interface DuplicateGroup {
  id: string;
  file_size: number;
  file_count: number;
  total_wasted_bytes: number;
  files: DuplicateFile[];
  common_parent: string;
}

export interface DuplicateSummary {
  total_groups: number;
  total_files: number;
  total_wasted_bytes: number;
  potential_savings: number;
  scan_session_id: string;
  group_count: number;
  total_duplicate_files: number;
  total_files_scan: number;
  scanned_at: string;
}

export interface DuplicateSortConfig {
  field: "size" | "count" | "wasted" | "name";
  direction: "asc" | "desc";
}

export interface DuplicateFilterState {
  search: string;
  folder: string;
  extensions: string[];
  countMin: number | null;
  countMax: number | null;
  sizeMin: number | null;
  sizeMax: number | null;
  extensionFilter: string;
  sortConfig: DuplicateSortConfig;
}

// ── Cache Cleaner ──────────────────────────────────────────

export type SafetyStatus = "safe" | "warning" | "error";
export type CacheStatus = "idle" | "analyzing" | "previewing" | "ready" | "cleaning" | "completed" | "cancelled" | "failed";

export interface CacheEntry {
  id: string;
  path: string;
  name: string;
  size: number;
  matched_rule: string;
  category_id: string;
  safety_status: SafetyStatus;
  selected: boolean;
}

export interface CacheCategory {
  id: string;
  name: string;
  display_name: string;
  icon: string;
  risk_level: "safe" | "moderate" | "risky";
  total_size: number;
  file_count: number;
  entries: CacheEntry[];
}

export interface CacheSummary {
  total_cache_size: number;
  potential_savings: number;
  category_count: number;
  total_entries: number;
  last_analysis: string | null;
  total_cache_bytes: number;
  safe_to_remove_bytes: number;
}

export interface CleanupPreview {
  files_to_remove: number;
  estimated_savings: number;
  risk_level: "low" | "medium" | "high";
  items: { path: string; size: number; category: string; safe: boolean }[];
}

export interface CacheFilter {
  search: string;
  categoryFilter: string;
  safetyFilter: SafetyStatus | "all";
}

// ── Health Score ───────────────────────────────────────────

export type HealthStatus = "idle" | "analyzing" | "ready" | "error";

export interface HealthScore {
  overall_score: number;
  grade: "A" | "B" | "C" | "D" | "E";
  factors: HealthFactor[];
  recommendations: HealthRecommendation[];
  savings: PotentialSavings;
  trend: HealthTrend;
  status_label: string;
  last_analysis: string | null;
}

export interface HealthMetrics {
  overall_score: number;
  factors: HealthFactor[];
  total_files: number;
  total_size_bytes: number;
  free_space_bytes: number;
  scanned_at: string;
}

export interface HealthFactor {
  name: string;
  label: string;
  score: number;
  weight: number;
  impact: number;
  color: string;
  icon: string;
  description: string;
}

export interface HealthRecommendation {
  id: string;
  message: string;
  category: string;
  priority: "urgent" | "high" | "medium" | "low";
  impact_estimate: string;
  action_label: string;
}

export interface PotentialSavings {
  total: number;
  duplicates: number;
  cache: number;
  large_files: number;
  duplicate_savings: number;
  cache_savings: number;
  large_file_savings: number;
}

export interface TrendDataPoint {
  date: string;
  score: number;
  value: number;
}

export interface HealthTrend {
  one_day: number;
  seven_days: number;
  thirty_days: number;
  ninety_days: number;
  data_points: TrendDataPoint[];
  health: TrendDataPoint[];
  storage: TrendDataPoint[];
  savings: TrendDataPoint[];
}

// ── Smart Move ─────────────────────────────────────────────

export interface MoveItem {
  id: string;
  path: string;
  name: string;
  size: number;
  type: string;
  selected: boolean;
}

export interface SuggestedLocation {
  id: string;
  path: string;
  label: string;
  free_space: number;
  type: "volume" | "folder" | "recent" | "frequent" | "smart";
}

export interface RecentDestination {
  id: string;
  path: string;
  label: string;
  last_used: string;
  count: number;
  move_count: number;
}

export type ConflictStatus = "none" | "exists" | "same_file" | "permission_denied" | "insufficient_space" | "invalid_path" | "rename_needed";
export type ValidationStatus = "pending" | "valid" | "invalid" | "warning" | "error";
export type Resolution = "rename" | "overwrite" | "skip" | "keep_both" | "replace";

export interface MoveResultDto {
  operation_id: string;
  source_path: string;
  destination_path: string;
  file_size: number;
  status: string;
  error: string | null;
}

export interface MoveOperation {
  id: string;
  source: string;
  destination: string;
  size: number;
  method: "rename" | "copy_delete";
  conflict_status: ConflictStatus;
  validation_status: ValidationStatus;
  resolution: Resolution;
  source_name: string;
  dest_name: string;
}

export interface MoveProgress {
  current_file: string;
  bytes_copied: number;
  total_bytes: number;
  files_completed: number;
  total_files: number;
  phase: string;
  percentage: number;
  moved_files: number;
  moved_bytes: number;
  elapsed_secs: number;
  eta_secs: number;
}

export interface UndoJournalEntry {
  id: string;
  operation_type: string;
  source_path: string;
  destination_path: string;
  size: number;
  status: "available" | "used" | "expired";
  timestamp: string;
  checksum_before: string;
  checksum_after: string;
  started_at: string;
  source_root: string;
  dest_root: string;
  operation_count: number;
  total_bytes: number;
  journal_path: string;
}

export interface MoveFilterState {
  search: string;
  statusFilter: string;
  conflictFilter: string;
  validationFilter: string;
}

// ── Settings ───────────────────────────────────────────────

export interface GeneralSettings {
  language: string;
  theme: string;
  startup_behavior: string;
}

export interface ScannerSettings {
  default_scan_location: string;
  ignore_rules: string[];
  max_depth: number | null;
  follow_symlinks: boolean;
  thread_count: number;
  min_file_size: number | null;
  max_file_size: number | null;
}

export interface DuplicateSettings {
  hash_strategy: string;
  min_group_size: number;
  verify_on_move: boolean;
  verify_on_delete: boolean;
}

export interface MoveSettings {
  default_destination: string;
  conflict_strategy: string;
  undo_retention_days: number;
}

export interface CacheCleanerSettings {
  enabled_categories: string[];
  min_safety_level: string;
  dry_run_by_default: boolean;
  cleanup_rules_path: string;
}

export interface HealthScoreSettings {
  scoring_sensitivity: string;
  show_anomalies: boolean;
  auto_analyze: boolean;
  recommendation_count: number;
}

export interface AppSettings {
  log_level: string;
  log_retention_days: number;
  enable_diagnostics: boolean;
  auto_export: boolean;
  settings_file_path: string;
}

export interface AppSettingsData {
  general: GeneralSettings;
  scanner: ScannerSettings;
  duplicate: DuplicateSettings;
  move: MoveSettings;
  cache_cleaner: CacheCleanerSettings;
  health_score: HealthScoreSettings;
  app: AppSettings;
}

// ── Dashboard ──────────────────────────────────────────────

export interface StorageOverview {
  total_capacity: number;
  used_space: number;
  free_space: number;
  file_count: number;
  directory_count: number;
  volume_name: string;
  total_bytes: number;
  used_bytes: number;
  free_bytes: number;
  usage_percent: number;
}

export interface LargeFileSummary {
  count: number;
  total_size: number;
  largest_file: { path: string; size: number } | null;
  threshold_mb: number;
  file_count: number;
  total_size_bytes: number;
}

export interface RecentScan {
  id: string;
  path: string;
  file_count: number;
  total_size: number;
  duration_secs: number;
  scanned_at: string;
  started_at: string;
  status: string;
  files_indexed: number;
  total_size_bytes: number;
}

export interface ScanStatusData {
  is_scanning: boolean;
  last_scan_at: string | null;
  total_scans: number;
  total_files_scanned: number;
  status: string;
  current_file: string;
  progress_percent: number;
}

// ── Cross-domain ───────────────────────────────────────────

export interface MoveRequest {
  source_paths: string[];
  destination: string;
  dry_run: boolean;
}

export interface MovePreview {
  operations: MoveOperation[];
  total_bytes: number;
  total_files: number;
  is_same_drive: boolean;
}
