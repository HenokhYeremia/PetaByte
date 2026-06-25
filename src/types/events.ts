import type { ScanProgress, ScanResult, MoveProgress, CacheStatus } from "./index";

export interface DuplicateProgress {
  groups_found: number;
  files_analyzed: number;
  current_stage: string;
  percentage: number;
}

export interface DuplicateResult {
  groups_found: number;
  total_wasted_bytes: number;
}

export interface HealthProgress {
  analysis_progress: number;
  factor_evaluation_progress: number;
  current_factor: string;
}

export interface HealthComplete {
  overall_score: number;
  grade: string;
}

export interface ErrorEvent {
  source: string;
  message: string;
  severity: "info" | "warning" | "error" | "critical";
}

export interface CacheProgress {
  items_processed: number;
  space_recovered: number;
  status: CacheStatus;
  total_items: number;
}

export interface MoveComplete {
  files_moved: number;
  total_bytes: number;
}

export type {
  ScanProgress,
  ScanResult,
  MoveProgress,
  CacheStatus,
};
