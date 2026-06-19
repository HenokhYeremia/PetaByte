export interface MockDuplicateFile {
  id: string;
  group_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  extension: string;
  modified_at: string;
  hash: string;
  hash_status: "partial" | "full" | "cached";
  is_kept: boolean;
  is_selected: boolean;
}

export interface MockDuplicateGroup {
  id: string;
  file_size: number;
  file_count: number;
  total_wasted_bytes: number;
  files: MockDuplicateFile[];
  common_parent: string;
  extensions: string[];
}

export interface MockDuplicateSummary {
  total_groups: number;
  total_duplicate_files: number;
  total_wasted_bytes: number;
  total_files_scan: number;
  scan_session_id: string;
  scan_path: string;
  scanned_at: string;
}

export interface MockFilterState {
  sizeMin: number | null;
  sizeMax: number | null;
  extensions: string[];
  folder: string;
  countMin: number | null;
  countMax: number | null;
}

export interface MockSortConfig {
  field: "file_size" | "file_count" | "total_wasted_bytes" | "extension";
  direction: "asc" | "desc";
}

function buildFilePath(base: string, name: string): string {
  return `D:\\Projects\\${base}\\${name}`;
}

const now = new Date();
const day = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();

export function makeMockFiles(base: string, names: string[], size: number): MockDuplicateFile[] {
  return names.map((name, i) => ({
    id: `${base}-${i}`,
    group_id: base,
    file_name: name,
    file_path: buildFilePath(base, name),
    file_size: size,
    extension: name.split(".").pop() || "",
    modified_at: day(i * 3),
    hash: `blake3-${base}-${i}`,
    hash_status: (i % 3 === 0 ? "full" : i % 3 === 1 ? "partial" : "cached") as MockDuplicateFile["hash_status"],
    is_kept: i === 0,
    is_selected: false,
  }));
}

export const mockDuplicateGroups: MockDuplicateGroup[] = [
  {
    id: "dup-001",
    file_size: 45_800_000,
    file_count: 12,
    total_wasted_bytes: 503_800_000,
    common_parent: "D:\\Projects\\web-app\\node_modules\\lodash",
    extensions: [".js", ".map"],
    files: makeMockFiles("lodash", [
      "lodash.min.js", "lodash.js", "index.js", "lodash.core.js",
      "lodash.min.js", "lodash.js", "index.js", "lodash.core.js",
      "lodash.min.js", "lodash.fp.js", "fp.js", "core.js",
    ], 45_800_000),
  },
  {
    id: "dup-002",
    file_size: 12_400_000,
    file_count: 8,
    total_wasted_bytes: 86_800_000,
    common_parent: "D:\\Projects\\web-app\\node_modules\\react-dom",
    extensions: [".js", ".cjs"],
    files: makeMockFiles("react-dom", [
      "client.js", "server.js", "index.js", "profiling.js",
      "client.js", "server.js", "index.js", "profiling.js",
    ], 12_400_000),
  },
  {
    id: "dup-003",
    file_size: 2_100_000,
    file_count: 15,
    total_wasted_bytes: 29_400_000,
    common_parent: "D:\\Projects\\web-app\\node_modules\\chalk",
    extensions: [".js", ".d.ts", ".map"],
    files: makeMockFiles("chalk", [
      "index.js", "source/index.js", "source/vendor/supports-color.js",
      "index.js", "source/index.js", "source/vendor/supports-color.js",
      "index.js", "source/index.js", "types/index.d.ts",
      "index.js", "source/index.js", "types/index.d.ts",
      "index.js", "source/index.js", "source/vendor/ansi-styles.js",
    ], 2_100_000),
  },
  {
    id: "dup-004",
    file_size: 320_000_000,
    file_count: 3,
    total_wasted_bytes: 640_000_000,
    common_parent: "D:\\Downloads\\Backups",
    extensions: [".zip"],
    files: makeMockFiles("backup", [
      "project-backup-2026-06.zip",
      "project-backup-2026-06 (copy).zip",
      "project-backup-2026-06 (2).zip",
    ], 320_000_000),
  },
  {
    id: "dup-005",
    file_size: 8_500_000,
    file_count: 6,
    total_wasted_bytes: 42_500_000,
    common_parent: "D:\\Projects\\data-science\\venv\\lib",
    extensions: [".pyc", ".py"],
    files: makeMockFiles("pandas", [
      "dataframe.py", "series.py", "core/groupby.py",
      "dataframe.py", "series.py", "core/groupby.py",
    ], 8_500_000),
  },
  {
    id: "dup-006",
    file_size: 156_000_000,
    file_count: 4,
    total_wasted_bytes: 468_000_000,
    common_parent: "D:\\Media\\Videos\\Projects",
    extensions: [".mp4", ".mov"],
    files: makeMockFiles("videos", [
      "demo-recording-2026.mp4",
      "demo-recording-2026.mp4",
      "demo-recording-2026-final.mp4",
      "demo-recording-2026.mp4",
    ], 156_000_000),
  },
  {
    id: "dup-007",
    file_size: 250_000,
    file_count: 10,
    total_wasted_bytes: 2_250_000,
    common_parent: "D:\\Projects\\blog\\content",
    extensions: [".md", ".mdx"],
    files: makeMockFiles("blog", [
      "getting-started.md", "api-reference.md", "tutorial.md",
      "getting-started.md", "api-reference.md", "tutorial.md",
      "getting-started.md", "api-reference.md",
      "getting-started.md", "quickstart.md",
    ], 250_000),
  },
];

export const mockDuplicateSummary: MockDuplicateSummary = {
  total_groups: mockDuplicateGroups.length,
  total_duplicate_files: mockDuplicateGroups.reduce((s, g) => s + g.file_count, 0),
  total_wasted_bytes: mockDuplicateGroups.reduce((s, g) => s + g.total_wasted_bytes, 0),
  total_files_scan: 284712,
  scan_session_id: "scan-res-001",
  scan_path: "D:\\Projects",
  scanned_at: "2026-06-19T14:32:34Z",
};

export const defaultFilterState: MockFilterState = {
  sizeMin: null,
  sizeMax: null,
  extensions: [],
  folder: "",
  countMin: null,
  countMax: null,
};

export const defaultSortConfig: MockSortConfig = {
  field: "total_wasted_bytes",
  direction: "desc",
};
