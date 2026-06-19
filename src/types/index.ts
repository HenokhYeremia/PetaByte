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

export interface DuplicateGroup {
  id: string;
  file_size: number;
  total_wasted_bytes: number;
  file_count: number;
  files: DuplicateFile[];
}

export interface DuplicateFile {
  id: string;
  path: string;
  hash: string;
  is_kept: boolean;
  is_selected: boolean;
}

export interface CacheCategory {
  id: string;
  name: string;
  display_name: string;
  risk_level: "safe" | "moderate" | "risky";
  total_size: number;
  file_count: number;
  entries: CacheEntry[];
}

export interface CacheEntry {
  id: string;
  path: string;
  size: number;
  matched_rule: string;
}

export interface HealthScore {
  overall_score: number;
  grade: "A" | "B" | "C" | "D" | "E";
  factors: HealthFactor[];
  recommendations: HealthRecommendation[];
  trend: HealthTrend;
}

export interface HealthFactor {
  name: string;
  label: string;
  score: number;
  weight: number;
  impact: number;
  color: string;
}

export interface HealthRecommendation {
  id: string;
  message: string;
  category: string;
  priority: "urgent" | "high" | "medium" | "low";
  impact_estimate: string;
}

export interface HealthTrend {
  one_day: number;
  seven_days: number;
  thirty_days: number;
  ninety_days: number;
}

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

export interface MoveOperation {
  source: string;
  destination: string;
  size: number;
  method: "rename" | "copy_delete";
}

export interface ScanProgress {
  session_id: string;
  scanned_files: number;
  total_files: number;
  scanned_size: number;
  total_size: number;
  elapsed_secs: number;
  eta_secs: number;
  status: string;
}
