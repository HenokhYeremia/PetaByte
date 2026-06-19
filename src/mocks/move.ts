export interface MockMoveItem {
  id: string;
  name: string;
  path: string;
  size: number;
  is_directory: boolean;
  modified_at: string;
  extension: string;
}

export interface MockSuggestedLocation {
  id: string;
  path: string;
  label: string;
  type: "frequent" | "recent" | "smart";
  free_space: number;
}

export interface MockRecentDestination {
  id: string;
  path: string;
  label: string;
  last_used: string;
  move_count: number;
}

export type MockConflictStatus = "none" | "exists" | "rename_needed";
export type MockValidationStatus = "valid" | "warning" | "error";
export type MockResolution = "keep_both" | "replace" | "skip";

export interface MockMoveOperation {
  id: string;
  source: string;
  source_name: string;
  destination: string;
  dest_name: string;
  size: number;
  method: "rename" | "copy_delete";
  conflict_status: MockConflictStatus;
  validation_status: MockValidationStatus;
  resolution: MockResolution;
}

export interface MockMoveProgress {
  total_files: number;
  moved_files: number;
  total_bytes: number;
  moved_bytes: number;
  current_file: string | null;
  elapsed_secs: number;
  eta_secs: number | null;
  status: "moving" | "paused" | "completed" | "cancelled" | "failed";
}

export interface MockUndoJournalEntry {
  id: string;
  started_at: string;
  completed_at: string | null;
  operation_count: number;
  total_bytes: number;
  status: "available" | "used" | "expired";
  source_root: string;
  dest_root: string;
  journal_path: string;
}

export interface MockFilterState {
  search: string;
  conflictFilter: MockConflictStatus | "all";
  validationFilter: MockValidationStatus | "all";
}

export const defaultFilterState: MockFilterState = {
  search: "",
  conflictFilter: "all",
  validationFilter: "all",
};

const now = new Date();
const day = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();

export const mockSelectedItems: MockMoveItem[] = [
  { id: "item-1", name: "project-backup-2026-06.zip", path: "D:\\Downloads\\Backups\\project-backup-2026-06.zip", size: 320_000_000, is_directory: false, modified_at: day(5), extension: ".zip" },
  { id: "item-2", name: "project-backup-2026-06 (copy).zip", path: "D:\\Downloads\\Backups\\project-backup-2026-06 (copy).zip", size: 320_000_000, is_directory: false, modified_at: day(5), extension: ".zip" },
  { id: "item-3", name: "demo-recording-2026.mp4", path: "D:\\Media\\Videos\\Projects\\demo-recording-2026.mp4", size: 156_000_000, is_directory: false, modified_at: day(12), extension: ".mp4" },
  { id: "item-4", name: "old-screenshots", path: "D:\\Media\\Screenshots\\old-screenshots", size: 2_400_000_000, is_directory: true, modified_at: day(30), extension: "" },
  { id: "item-5", name: "node_modules_backup", path: "D:\\Projects\\web-app\\node_modules_backup", size: 850_000_000, is_directory: true, modified_at: day(60), extension: "" },
];

export const mockSuggestedLocations: MockSuggestedLocation[] = [
  { id: "sug-1", path: "D:\\Archive", label: "Archive Folder", type: "frequent", free_space: 800_000_000_000 },
  { id: "sug-2", path: "D:\\Media\\Organized\\Videos", label: "Organized Videos", type: "smart", free_space: 450_000_000_000 },
  { id: "sug-3", path: "D:\\Backups\\Archived", label: "Backup Archive", type: "frequent", free_space: 600_000_000_000 },
  { id: "sug-4", path: "E:\\Projects\\Archive", label: "External Archive", type: "recent", free_space: 1_200_000_000_000 },
  { id: "sug-5", path: "C:\\Users\\Lenovo\\OneDrive\\Archive", label: "Cloud Archive", type: "smart", free_space: 50_000_000_000 },
];

export const mockRecentDestinations: MockRecentDestination[] = [
  { id: "rec-1", path: "D:\\Archive\\Projects", label: "D:\\Archive\\Projects", last_used: day(2), move_count: 12 },
  { id: "rec-2", path: "D:\\Backups\\Archived\\2026", label: "D:\\Backups\\Archived\\2026", last_used: day(7), move_count: 8 },
  { id: "rec-3", path: "E:\\Projects\\Old", label: "E:\\Projects\\Old", last_used: day(14), move_count: 5 },
  { id: "rec-4", path: "D:\\Media\\Organized", label: "D:\\Media\\Organized", last_used: day(21), move_count: 3 },
];

export const mockMoveOperations: MockMoveOperation[] = [
  { id: "op-1", source: "D:\\Downloads\\Backups\\project-backup-2026-06.zip", source_name: "project-backup-2026-06.zip", destination: "D:\\Archive\\Backups\\project-backup-2026-06.zip", dest_name: "project-backup-2026-06.zip", size: 320_000_000, method: "rename", conflict_status: "none", validation_status: "valid", resolution: "keep_both" },
  { id: "op-2", source: "D:\\Downloads\\Backups\\project-backup-2026-06 (copy).zip", source_name: "project-backup-2026-06 (copy).zip", destination: "D:\\Archive\\Backups\\project-backup-2026-06 (copy).zip", dest_name: "project-backup-2026-06 (copy).zip", size: 320_000_000, method: "rename", conflict_status: "exists", validation_status: "warning", resolution: "replace" },
  { id: "op-3", source: "D:\\Media\\Videos\\Projects\\demo-recording-2026.mp4", source_name: "demo-recording-2026.mp4", destination: "D:\\Media\\Organized\\Videos\\demo-recording-2026.mp4", dest_name: "demo-recording-2026.mp4", size: 156_000_000, method: "rename", conflict_status: "none", validation_status: "valid", resolution: "keep_both" },
  { id: "op-4", source: "D:\\Media\\Screenshots\\old-screenshots", source_name: "old-screenshots", destination: "D:\\Archive\\Screenshots\\old-screenshots", dest_name: "old-screenshots", size: 2_400_000_000, method: "copy_delete", conflict_status: "rename_needed", validation_status: "warning", resolution: "keep_both" },
  { id: "op-5", source: "D:\\Projects\\web-app\\node_modules_backup", source_name: "node_modules_backup", destination: "D:\\Archive\\Projects\\node_modules_backup", dest_name: "node_modules_backup", size: 850_000_000, method: "copy_delete", conflict_status: "exists", validation_status: "error", resolution: "skip" },
];

export const mockMoveProgress: MockMoveProgress = {
  total_files: 5,
  moved_files: 2,
  total_bytes: 4_046_000_000,
  moved_bytes: 640_000_000,
  current_file: "D:\\Downloads\\Backups\\project-backup-2026-06 (copy).zip",
  elapsed_secs: 14,
  eta_secs: 72,
  status: "moving",
};

export const mockUndoJournal: MockUndoJournalEntry[] = [
  { id: "undo-1", started_at: day(0), completed_at: day(0), operation_count: 3, total_bytes: 1_200_000_000, status: "available", source_root: "D:\\Downloads", dest_root: "D:\\Archive", journal_path: "C:\\Users\\Lenovo\\.petabyte\\journal\\undo-1.json" },
  { id: "undo-2", started_at: day(3), completed_at: day(3), operation_count: 8, total_bytes: 4_500_000_000, status: "available", source_root: "D:\\Media\\Videos", dest_root: "D:\\Media\\Organized", journal_path: "C:\\Users\\Lenovo\\.petabyte\\journal\\undo-2.json" },
  { id: "undo-3", started_at: day(10), completed_at: day(10), operation_count: 2, total_bytes: 85_000_000, status: "used", source_root: "D:\\Projects\\temp", dest_root: "D:\\Projects\\archived", journal_path: "C:\\Users\\Lenovo\\.petabyte\\journal\\undo-3.json" },
  { id: "undo-4", started_at: day(20), completed_at: null, operation_count: 15, total_bytes: 12_800_000_000, status: "expired", source_root: "D:\\Old\\Data", dest_root: "E:\\Cold\\Storage", journal_path: "C:\\Users\\Lenovo\\.petabyte\\journal\\undo-4.json" },
];

export const mockSummaryStats = {
  selectedFiles: mockSelectedItems.length,
  totalSize: mockSelectedItems.reduce((s, i) => s + i.size, 0),
  estimatedSavings: mockSelectedItems.reduce((s, i) => s + i.size, 0) * 0.85,
};
