export interface MockStorageOverview {
  total_bytes: number;
  used_bytes: number;
  free_bytes: number;
  usage_percent: number;
}

export interface MockHealthScore {
  overall_score: number;
  grade: "A" | "B" | "C" | "D" | "E";
  status_label: string;
}

export interface MockDuplicateSummary {
  group_count: number;
  total_wasted_bytes: number;
}

export interface MockCacheSummary {
  total_cache_bytes: number;
  safe_to_remove_bytes: number;
  category_count: number;
}

export interface MockLargeFileSummary {
  file_count: number;
  total_size_bytes: number;
  threshold_bytes: number;
}

export interface MockRecentScan {
  id: string;
  started_at: string;
  completed_at: string | null;
  duration_secs: number;
  files_indexed: number;
  total_size_bytes: number;
  status: "completed" | "failed" | "cancelled";
}

export interface MockScanStatus {
  status: "idle" | "running" | "completed" | "failed";
  progress_percent: number;
  current_file: string | null;
}

export interface MockDashboardData {
  storage: MockStorageOverview;
  health: MockHealthScore;
  duplicates: MockDuplicateSummary;
  cache: MockCacheSummary;
  largeFiles: MockLargeFileSummary;
  recentScan: MockRecentScan;
  scanStatus: MockScanStatus;
}

export const mockDashboardData: MockDashboardData = {
  storage: {
    total_bytes: 1_000_000_000_000,
    used_bytes: 650_000_000_000,
    free_bytes: 350_000_000_000,
    usage_percent: 65,
  },
  health: {
    overall_score: 72,
    grade: "B",
    status_label: "Good",
  },
  duplicates: {
    group_count: 1542,
    total_wasted_bytes: 12_500_000_000,
  },
  cache: {
    total_cache_bytes: 8_200_000_000,
    safe_to_remove_bytes: 6_800_000_000,
    category_count: 5,
  },
  largeFiles: {
    file_count: 87,
    total_size_bytes: 45_300_000_000,
    threshold_bytes: 100_000_000,
  },
  recentScan: {
    id: "scan-001",
    started_at: "2026-06-19T14:30:00Z",
    completed_at: "2026-06-19T14:32:34Z",
    duration_secs: 154,
    files_indexed: 284712,
    total_size_bytes: 480_000_000_000,
    status: "completed",
  },
  scanStatus: {
    status: "idle",
    progress_percent: 0,
    current_file: null,
  },
};
