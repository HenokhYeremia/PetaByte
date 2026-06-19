export type MockSafetyStatus = "safe" | "warning" | "error";
export type MockCacheStatus = "idle" | "analyzing" | "previewing" | "ready" | "cleaning" | "completed" | "cancelled" | "failed";

export interface MockCacheEntry {
  id: string;
  path: string;
  name: string;
  size: number;
  matched_rule: string;
  category_id: string;
  safety_status: MockSafetyStatus;
  selected: boolean;
}

export interface MockCacheCategory {
  id: string;
  name: string;
  display_name: string;
  icon: string;
  risk_level: "safe" | "moderate" | "risky";
  total_size: number;
  file_count: number;
  entries: MockCacheEntry[];
}

export interface MockCacheSummary {
  total_cache_size: number;
  potential_savings: number;
  category_count: number;
  total_entries: number;
  last_analysis: string | null;
}

export interface MockCleanupPreview {
  files_to_remove: number;
  estimated_savings: number;
  risk_level: "low" | "medium" | "high";
  items: { path: string; size: number; category: string; safe: boolean }[];
}

export interface MockCacheFilter {
  search: string;
  categoryFilter: string;
  safetyFilter: MockSafetyStatus | "all";
}

export const defaultCacheFilter: MockCacheFilter = {
  search: "",
  categoryFilter: "all",
  safetyFilter: "all",
};

const now = new Date();
const day = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();

function makeEntries(
  categoryId: string,
  basePath: string,
  names: string[],
  sizes: number[],
  rules: string[],
  safetyStatuses: MockSafetyStatus[],
): MockCacheEntry[] {
  return names.map((name, i) => ({
    id: `${categoryId}-${i}`,
    path: `${basePath}\\${name}`,
    name,
    size: sizes[i % sizes.length],
    matched_rule: rules[i % rules.length],
    category_id: categoryId,
    safety_status: safetyStatuses[i % safetyStatuses.length],
    selected: false,
  }));
}

const browserEntries = makeEntries(
  "browser", "C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Cache",
  ["cache_001.bin", "cache_002.bin", "code_cache_01.bin", "media_cache.bin", "gpu_cache.bin", "service_worker.bin"],
  [12_000_000, 45_000_000, 28_000_000, 156_000_000, 8_000_000, 3_200_000],
  ["chrome:cache/*", "chrome:code_cache/*", "chrome:gpu_cache/*", "chrome:service_worker/*"],
  ["safe", "safe", "safe", "safe", "safe", "safe"],
);

const devEntries = makeEntries(
  "developer", "D:\\Projects\\web-app",
  ["node_modules", ".next", "dist", "build", ".cache", "target"],
  [520_000_000, 340_000_000, 120_000_000, 80_000_000, 45_000_000, 210_000_000],
  ["glob:**/node_modules/*", "glob:**/.next/*", "glob:**/dist/*", "glob:**/build/*", "glob:**/.cache/*", "glob:**/target/*"],
  ["safe", "safe", "safe", "safe", "safe", "safe"],
);

const tempEntries = makeEntries(
  "temporary", "C:\\Users\\Lenovo\\AppData\\Local\\Temp",
  ["vs_installer.log", "dotnet_sdk_errors.txt", "npm_install_5362.log", "pip_cache.zip", "msi_installer.tmp", "crash_dump.dmp"],
  [2_400_000, 850_000, 1_600_000, 5_200_000, 12_000_000, 48_000_000],
  ["temp:*", "temp:log:*", "temp:dump:*", "temp:installer:*"],
  ["safe", "safe", "safe", "safe", "warning", "warning"],
);

const pkgEntries = makeEntries(
  "package_manager", "C:\\Users\\Lenovo",
  ["npm/_cacache", "npm/_logs", "npm/_build", "pip/cache", "cargo/registry/cache", "cargo/git/db"],
  [180_000_000, 3_500_000, 12_000_000, 65_000_000, 95_000_000, 28_000_000],
  ["npm:cache:*", "npm:logs:*", "pip:cache:*", "cargo:cache:*"],
  ["safe", "safe", "safe", "safe", "safe", "safe"],
);

const appEntries = makeEntries(
  "application", "C:\\Users\\Lenovo\\AppData\\Local",
  ["Microsoft\\VSStudio\\ComponentModelCache", "Microsoft\\Team Foundation\\Cache", "Microsoft\\Windows\\INetCache", "Microsoft\\Windows\\WER\\ReportArchive"],
  [34_000_000, 8_000_000, 56_000_000, 120_000_000],
  ["app:vs_cache:*", "app:tfs_cache:*", "app:inet_cache:*", "app:wer_reports:*"],
  ["safe", "safe", "warning", "error"],
);

export const mockCategories: MockCacheCategory[] = [
  {
    id: "browser",
    name: "browser",
    display_name: "Browser Cache",
    icon: "Globe",
    risk_level: "safe",
    total_size: browserEntries.reduce((s, e) => s + e.size, 0),
    file_count: browserEntries.length,
    entries: browserEntries,
  },
  {
    id: "developer",
    name: "developer",
    display_name: "Developer Cache",
    icon: "Code2",
    risk_level: "safe",
    total_size: devEntries.reduce((s, e) => s + e.size, 0),
    file_count: devEntries.length,
    entries: devEntries,
  },
  {
    id: "temporary",
    name: "temporary",
    display_name: "Temporary Files",
    icon: "FileClock",
    risk_level: "moderate",
    total_size: tempEntries.reduce((s, e) => s + e.size, 0),
    file_count: tempEntries.length,
    entries: tempEntries,
  },
  {
    id: "package_manager",
    name: "package_manager",
    display_name: "Package Manager Cache",
    icon: "Package",
    risk_level: "safe",
    total_size: pkgEntries.reduce((s, e) => s + e.size, 0),
    file_count: pkgEntries.length,
    entries: pkgEntries,
  },
  {
    id: "application",
    name: "application",
    display_name: "Application Cache",
    icon: "AppWindow",
    risk_level: "moderate",
    total_size: appEntries.reduce((s, e) => s + e.size, 0),
    file_count: appEntries.length,
    entries: appEntries,
  },
];

export const mockCacheSummary: MockCacheSummary = {
  total_cache_size: mockCategories.reduce((s, c) => s + c.total_size, 0),
  potential_savings: Math.round(mockCategories.reduce((s, c) => s + c.total_size, 0) * 0.7),
  category_count: mockCategories.length,
  total_entries: mockCategories.reduce((s, c) => s + c.entries.length, 0),
  last_analysis: day(2),
};

export function computeCleanupPreview(categories: MockCacheCategory[]): MockCleanupPreview {
  const selected = categories.flatMap((c) =>
    c.entries.filter((e) => e.selected).map((e) => ({
      path: e.path,
      size: e.size,
      category: c.display_name,
      safe: e.safety_status === "safe",
    })),
  );
  const totalSize = selected.reduce((s, i) => s + i.size, 0);
  const hasRisky = selected.some((i) => !i.safe);
  return {
    files_to_remove: selected.length,
    estimated_savings: totalSize,
    risk_level: hasRisky ? "high" : selected.length > 10 ? "medium" : "low",
    items: selected,
  };
}
