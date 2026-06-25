import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { StatCard } from "@/components/dashboard/StatCard";
import { DashboardGrid, DashboardSection } from "@/components/dashboard/DashboardGrid";
import { StorageOverviewCard } from "@/components/dashboard/StorageOverviewCard";
import { HealthScoreCard } from "@/components/dashboard/HealthScoreCard";
import { DuplicateFilesCard } from "@/components/dashboard/DuplicateFilesCard";
import { CacheCleanerCard } from "@/components/dashboard/CacheCleanerCard";
import { LargeFilesCard } from "@/components/dashboard/LargeFilesCard";
import { RecentScanCard } from "@/components/dashboard/RecentScanCard";
import { QuickActionsPanel } from "@/components/dashboard/QuickActionsPanel";
import { ScanStatusWidget } from "@/components/dashboard/ScanStatusWidget";
import type { StorageOverview, HealthScore, DuplicateSummary, CacheSummary, LargeFileSummary, RecentScan } from "@/types";

const mockStorage: StorageOverview = {
  total_capacity: 1_000_000_000_000,
  used_space: 650_000_000_000,
  free_space: 350_000_000_000,
  file_count: 0,
  directory_count: 0,
  volume_name: "",
  total_bytes: 1_000_000_000_000,
  used_bytes: 650_000_000_000,
  free_bytes: 350_000_000_000,
  usage_percent: 65,
};

const mockHealth: HealthScore = {
  overall_score: 72,
  grade: "B",
  factors: [],
  recommendations: [],
  savings: { total: 0, duplicates: 0, cache: 0, large_files: 0, duplicate_savings: 0, cache_savings: 0, large_file_savings: 0 },
  trend: { one_day: 0, seven_days: 0, thirty_days: 0, ninety_days: 0, data_points: [], health: [], storage: [], savings: [] },
  status_label: "Good",
  last_analysis: "15 Jun, 17:30",
};

const mockDuplicates: DuplicateSummary = {
  total_groups: 1500,
  total_files: 1500,
  total_wasted_bytes: 1_700_000_000,
  potential_savings: 1_700_000_000,
  scan_session_id: "session-1",
  group_count: 1500,
  total_duplicate_files: 1500,
  total_files_scan: 284_700,
  scanned_at: "2026-06-15T17:30:00.000Z",
};

const mockCache: CacheSummary = {
  total_cache_size: 8_160_000_000,
  potential_savings: 6_000_000_000,
  category_count: 5,
  total_entries: 12,
  last_analysis: null,
  total_cache_bytes: 8_160_000_000,
  safe_to_remove_bytes: 6_000_000_000,
};

const mockLargeFiles: LargeFileSummary = {
  count: 87,
  total_size: 500_000_000_000,
  largest_file: null,
  threshold_mb: 100,
  file_count: 87,
  total_size_bytes: 500_000_000_000,
};

const mockRecentScan: RecentScan = {
  id: "hist-001",
  path: "D:\\Projects",
  file_count: 284_700,
  total_size: 480_000_000_000,
  duration_secs: 154,
  scanned_at: "2026-06-15T17:30:00.000Z",
  started_at: "2026-06-15T17:27:26.000Z",
  status: "completed",
  files_indexed: 284_700,
  total_size_bytes: 480_000_000_000,
};

describe("StatCard", () => {
  it("renders with data", () => {
    render(<StatCard title="Files" value="1,234" subtitle="Total files" />);
    expect(screen.getByText("Files")).toBeInTheDocument();
    expect(screen.getByText("1,234")).toBeInTheDocument();
    expect(screen.getByText("Total files")).toBeInTheDocument();
  });

  it("renders loading skeleton", () => {
    const { container } = render(<StatCard title="Files" value="" loading />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders empty state", () => {
    render(<StatCard title="Files" value="" empty emptyMessage="No files" />);
    expect(screen.getByText("No files")).toBeInTheDocument();
  });

  it("renders trend indicator", () => {
    render(<StatCard title="Files" value="100" trend={{ direction: "up", label: "10%" }} />);
    expect(screen.getByText("10%")).toBeInTheDocument();
  });

  it("renders icon", () => {
    render(<StatCard title="Files" value="100" icon={<span data-testid="icon" />} />);
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });
});

describe("DashboardGrid", () => {
  it("renders children", () => {
    render(<DashboardGrid><p>Item</p></DashboardGrid>);
    expect(screen.getByText("Item")).toBeInTheDocument();
  });
});

describe("DashboardSection", () => {
  it("renders title and description", () => {
    render(<DashboardSection title="Section" description="Desc"><p>Content</p></DashboardSection>);
    expect(screen.getByText("Section")).toBeInTheDocument();
    expect(screen.getByText("Desc")).toBeInTheDocument();
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("renders without header", () => {
    render(<DashboardSection><p>Content</p></DashboardSection>);
    expect(screen.getByText("Content")).toBeInTheDocument();
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });
});

describe("StorageOverviewCard", () => {
  it("renders with data", () => {
    render(<StorageOverviewCard data={mockStorage} />);
    expect(screen.getByText("Storage Overview")).toBeInTheDocument();
    expect(screen.getByText("931.3 GB")).toBeInTheDocument();
    expect(screen.getByText("605.4 GB")).toBeInTheDocument();
    expect(screen.getByText("326.0 GB")).toBeInTheDocument();
  });

  it("renders loading state", () => {
    const { container } = render(<StorageOverviewCard data={null} loading />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders empty state when data is null", () => {
    render(<StorageOverviewCard data={null} />);
    expect(screen.getByText("Run a scan to see storage overview.")).toBeInTheDocument();
  });
});

describe("HealthScoreCard", () => {
  it("renders with score", () => {
    render(<HealthScoreCard data={mockHealth} />);
    expect(screen.getByText("Health Score")).toBeInTheDocument();
    expect(screen.getByText("72")).toBeInTheDocument();
    expect(screen.getByText(/Grade B/)).toBeInTheDocument();
  });

  it("renders loading state", () => {
    const { container } = render(<HealthScoreCard data={null} loading />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders empty state", () => {
    render(<HealthScoreCard data={null} />);
    expect(screen.getByText("Run a health assessment to see your score.")).toBeInTheDocument();
  });

  it("renders grade A for score >= 90", () => {
    render(<HealthScoreCard data={{ overall_score: 95, grade: "A", status_label: "Excellent", factors: [], recommendations: [], savings: { total: 0, duplicates: 0, cache: 0, large_files: 0, duplicate_savings: 0, cache_savings: 0, large_file_savings: 0 }, trend: { one_day: 0, seven_days: 0, thirty_days: 0, ninety_days: 0, data_points: [], health: [], storage: [], savings: [] }, last_analysis: null }} />);
    expect(screen.getByText(/Grade A/)).toBeInTheDocument();
  });
});

describe("DuplicateFilesCard", () => {
  it("renders with data", () => {
    render(<DuplicateFilesCard data={mockDuplicates} />);
    expect(screen.getByText("Duplicate Files")).toBeInTheDocument();
    expect(screen.getByText("1.5K")).toBeInTheDocument();
  });

  it("renders loading state", () => {
    const { container } = render(<DuplicateFilesCard data={null} loading />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders empty state", () => {
    render(<DuplicateFilesCard data={{ total_groups: 0, total_files: 0, total_wasted_bytes: 0, potential_savings: 0, scan_session_id: "", group_count: 0, total_duplicate_files: 0, total_files_scan: 0, scanned_at: "" }} />);
    expect(screen.getByText("No duplicate files detected")).toBeInTheDocument();
  });
});

describe("CacheCleanerCard", () => {
  it("renders with data", () => {
    render(<CacheCleanerCard data={mockCache} />);
    expect(screen.getByText("Cache Cleaner")).toBeInTheDocument();
    expect(screen.getByText("7.6 GB")).toBeInTheDocument();
  });

  it("renders empty state", () => {
    render(<CacheCleanerCard data={{ total_cache_size: 0, potential_savings: 0, category_count: 0, total_entries: 0, last_analysis: null, total_cache_bytes: 0, safe_to_remove_bytes: 0 }} />);
    expect(screen.getByText("No cache files detected")).toBeInTheDocument();
  });
});

describe("LargeFilesCard", () => {
  it("renders with data", () => {
    render(<LargeFilesCard data={mockLargeFiles} />);
    expect(screen.getByText("Large Files")).toBeInTheDocument();
    expect(screen.getByText("87")).toBeInTheDocument();
  });

  it("renders empty state", () => {
    render(<LargeFilesCard data={{ count: 0, total_size: 0, largest_file: null, threshold_mb: 100, file_count: 0, total_size_bytes: 0 }} />);
    expect(screen.getByText("No large files detected")).toBeInTheDocument();
  });
});

describe("RecentScanCard", () => {
  it("renders with completed scan data", () => {
    render(<RecentScanCard data={mockRecentScan} />);
    expect(screen.getByText("Recent Scan")).toBeInTheDocument();
    expect(screen.getByText("284.7K files")).toBeInTheDocument();
  });

  it("renders loading state", () => {
    const { container } = render(<RecentScanCard data={null} loading />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders empty state", () => {
    render(<RecentScanCard data={null} />);
    expect(screen.getByText("No scans have been performed yet.")).toBeInTheDocument();
  });
});

describe("QuickActionsPanel", () => {
  it("renders default actions", () => {
    render(<QuickActionsPanel />);
    expect(screen.getByText("Start Scan")).toBeInTheDocument();
    expect(screen.getByText("Find Duplicates")).toBeInTheDocument();
    expect(screen.getByText("Clean Cache")).toBeInTheDocument();
    expect(screen.getByText("View Health Report")).toBeInTheDocument();
  });

  it("fires onAction when clicked", async () => {
    const onAction = vi.fn();
    render(<QuickActionsPanel onAction={onAction} />);
    await userEvent.click(screen.getByText("Start Scan"));
    expect(onAction).toHaveBeenCalledWith("start-scan");
  });

  it("disables provided action buttons", () => {
    render(<QuickActionsPanel />);
    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).not.toBeDisabled();
    expect(buttons[1]).toBeDisabled();
    expect(buttons[2]).toBeDisabled();
    expect(buttons[3]).toBeDisabled();
  });
});

describe("ScanStatusWidget", () => {
  it("renders idle state", () => {
render(<ScanStatusWidget data={{ status: "idle", progress_percent: 0, current_file: "", is_scanning: false, last_scan_at: null, total_scans: 0, total_files_scanned: 0 }} />);
    expect(screen.getByText("Idle")).toBeInTheDocument();
  });
 
  it("renders running state with progress", () => {
    render(<ScanStatusWidget data={{ status: "running", progress_percent: 57, current_file: "file.txt", is_scanning: true, last_scan_at: null, total_scans: 0, total_files_scanned: 0 }} />);
    expect(screen.getByText("Scanning")).toBeInTheDocument();
    expect(screen.getByText("57%")).toBeInTheDocument();
    expect(screen.getByText("file.txt")).toBeInTheDocument();
  });

  it("renders completed state", () => {
render(<ScanStatusWidget data={{ status: "completed", progress_percent: 100, current_file: "", is_scanning: false, last_scan_at: null, total_scans: 0, total_files_scanned: 0 }} />);
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });
 
  it("renders failed state", () => {
    render(<ScanStatusWidget data={{ status: "failed", progress_percent: 0, current_file: "", is_scanning: false, last_scan_at: null, total_scans: 0, total_files_scanned: 0 }} />);
    expect(screen.getByText("Failed")).toBeInTheDocument();
  });

  it("renders null when data is null", () => {
    const { container } = render(<ScanStatusWidget data={null} />);
    expect(container.innerHTML).toBe("");
  });
});
