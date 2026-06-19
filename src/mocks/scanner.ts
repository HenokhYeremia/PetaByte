export interface MockDrive {
  mount_point: string;
  label: string;
  total_bytes: number;
  free_bytes: number;
  file_system: string;
}

export interface MockIgnoreRule {
  id: string;
  pattern: string;
  enabled: boolean;
  description: string;
  builtin: boolean;
}

export interface MockScanConfig {
  path: string;
  recursive: boolean;
  follow_symlinks: boolean;
  max_depth: number | null;
  min_file_size: number | null;
  max_file_size: number | null;
  thread_count: number;
}

export interface MockScanProgress {
  session_id: string;
  status: "idle" | "scanning" | "paused" | "completed" | "cancelled" | "failed";
  scanned_files: number;
  total_files: number | null;
  scanned_size: number;
  total_size: number | null;
  elapsed_secs: number;
  eta_secs: number | null;
  current_path: string | null;
  speed_files_per_sec: number;
  errors: number;
  total_directories: number;
}

export interface MockScanResult {
  session_id: string;
  path: string;
  total_files: number;
  total_directories: number;
  total_size: number;
  duration_secs: number;
  errors: number;
  status: "completed" | "cancelled" | "failed";
  started_at: string;
  completed_at: string;
}

export interface MockHistoryItem {
  id: string;
  path: string;
  total_files: number;
  total_directories: number;
  total_size: number;
  duration_secs: number;
  status: "completed" | "cancelled" | "failed";
  started_at: string;
}

export const mockDrives: MockDrive[] = [
  { mount_point: "C:\\", label: "Windows", total_bytes: 500_000_000_000, free_bytes: 120_000_000_000, file_system: "NTFS" },
  { mount_point: "D:\\", label: "Data", total_bytes: 1_000_000_000_000, free_bytes: 350_000_000_000, file_system: "NTFS" },
  { mount_point: "E:\\", label: "Backup", total_bytes: 2_000_000_000_000, free_bytes: 1_200_000_000_000, file_system: "NTFS" },
];

export const mockIgnoreRules: MockIgnoreRule[] = [
  { id: "sys-win", pattern: "C:\\Windows\\**", enabled: true, description: "System directory", builtin: true },
  { id: "sys-prog", pattern: "C:\\Program Files\\**", enabled: true, description: "Program Files", builtin: true },
  { id: "sys-prog86", pattern: "C:\\Program Files (x86)\\**", enabled: true, description: "Program Files (x86)", builtin: true },
  { id: "node-modules", pattern: "**/node_modules/**", enabled: true, description: "Node.js dependencies", builtin: true },
  { id: "target-dir", pattern: "**/target/**", enabled: true, description: "Rust build artifacts", builtin: true },
  { id: "git-dir", pattern: "**/.git/**", enabled: true, description: "Git repository data", builtin: true },
  { id: "cache-dir", pattern: "**/.cache/**", enabled: true, description: "Application cache", builtin: true },
  { id: "ds-store", pattern: "**/.DS_Store", enabled: false, description: "macOS metadata files", builtin: true },
  { id: "thumbs-db", pattern: "**/Thumbs.db", enabled: true, description: "Windows thumbnail cache", builtin: true },
  { id: "user-custom", pattern: "", enabled: true, description: "Custom pattern", builtin: false },
];

export const defaultScanConfig: MockScanConfig = {
  path: "",
  recursive: true,
  follow_symlinks: false,
  max_depth: null,
  min_file_size: null,
  max_file_size: null,
  thread_count: 4,
};

export const mockScanProgress: MockScanProgress = {
  session_id: "scan-active-001",
  status: "scanning",
  scanned_files: 84721,
  total_files: null,
  scanned_size: 180_000_000_000,
  total_size: null,
  elapsed_secs: 134,
  eta_secs: null,
  current_path: "D:\\Projects\\petabyte\\node_modules\\some-package\\dist\\index.js",
  speed_files_per_sec: 3521,
  errors: 5,
  total_directories: 6241,
};

export const mockCompletedProgress: MockScanProgress = {
  session_id: "scan-completed-001",
  status: "completed",
  scanned_files: 284712,
  total_files: 284712,
  scanned_size: 480_000_000_000,
  total_size: 480_000_000_000,
  elapsed_secs: 154,
  eta_secs: 0,
  current_path: null,
  speed_files_per_sec: 1849,
  errors: 12,
  total_directories: 18241,
};

export const mockScanResult: MockScanResult = {
  session_id: "scan-res-001",
  path: "D:\\Projects",
  total_files: 284712,
  total_directories: 18241,
  total_size: 480_000_000_000,
  duration_secs: 154,
  errors: 12,
  status: "completed",
  started_at: "2026-06-19T14:30:00Z",
  completed_at: "2026-06-19T14:32:34Z",
};

export const mockScanHistory: MockHistoryItem[] = [
  {
    id: "hist-001",
    path: "D:\\Projects",
    total_files: 284712,
    total_directories: 18241,
    total_size: 480_000_000_000,
    duration_secs: 154,
    status: "completed",
    started_at: "2026-06-19T14:30:00Z",
  },
  {
    id: "hist-002",
    path: "C:\\Users\\Lenovo\\Documents",
    total_files: 45210,
    total_directories: 3802,
    total_size: 12_500_000_000,
    duration_secs: 48,
    status: "completed",
    started_at: "2026-06-18T09:15:00Z",
  },
  {
    id: "hist-003",
    path: "D:\\Downloads",
    total_files: 128400,
    total_directories: 4210,
    total_size: 256_000_000_000,
    duration_secs: 92,
    status: "completed",
    started_at: "2026-06-17T16:45:00Z",
  },
  {
    id: "hist-004",
    path: "C:\\Users\\Lenovo\\AppData\\Local",
    total_files: 5210,
    total_directories: 890,
    total_size: 1_200_000_000,
    duration_secs: 12,
    status: "cancelled",
    started_at: "2026-06-16T11:20:00Z",
  },
  {
    id: "hist-005",
    path: "E:\\Media\\Photos",
    total_files: 84500,
    total_directories: 1240,
    total_size: 892_000_000_000,
    duration_secs: 310,
    status: "completed",
    started_at: "2026-06-15T08:00:00Z",
  },
];
