import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { DriveSelector } from "@/components/scanner/DriveSelector";
import { FolderSelector } from "@/components/scanner/FolderSelector";
import { IgnoreRulesPreview } from "@/components/scanner/IgnoreRulesPreview";
import { ScanOptions } from "@/components/scanner/ScanOptions";
import { ScanControlPanel } from "@/components/scanner/ScanControlPanel";
import { ScanProgressSection } from "@/components/scanner/ScanProgressSection";
import { ScanResultSummary } from "@/components/scanner/ScanResultSummary";
import { RecentScanHistory } from "@/components/scanner/RecentScanHistory";
import type { Drive, IgnoreRule, ScanConfig, ScanProgress, ScanResult, HistoryItem } from "@/types";

const mockDrives: Drive[] = [
  { letter: "C", mount_point: "C:\\", label: "Windows", total_bytes: 500_000_000_000, free_bytes: 150_000_000_000, is_removable: false, file_system: "NTFS" },
  { letter: "D", mount_point: "D:\\", label: "Data", total_bytes: 1_000_000_000_000, free_bytes: 600_000_000_000, is_removable: false, file_system: "NTFS" },
  { letter: "E", mount_point: "E:\\", label: "Backup", total_bytes: 2_000_000_000_000, free_bytes: 1_500_000_000_000, is_removable: false, file_system: "exFAT" },
];

const mockIgnoreRules: IgnoreRule[] = [
  { id: "rule-1", pattern: "**/node_modules/**", label: "Node modules", enabled: true, is_system: true, description: "Node.js dependencies", builtin: true },
  { id: "rule-2", pattern: "**/.git/**", label: "Git directory", enabled: true, is_system: true, description: "Git version control", builtin: true },
  { id: "rule-3", pattern: "**/target/**", label: "Rust build", enabled: true, is_system: true, description: "Rust build output", builtin: true },
  { id: "rule-4", pattern: "**/.next/**", label: "Next.js build", enabled: true, is_system: true, description: "Next.js build output", builtin: true },
  { id: "rule-5", pattern: "**/__pycache__/**", label: "Python cache", enabled: true, is_system: true, description: "Python bytecode cache", builtin: true },
  { id: "rule-6", pattern: "**/*.pyc", label: "Python bytecode", enabled: true, is_system: true, description: "Compiled Python files", builtin: true },
  { id: "rule-7", pattern: "**/.DS_Store", label: "macOS metadata", enabled: true, is_system: true, description: "macOS folder metadata", builtin: true },
  { id: "rule-8", pattern: "**/Thumbs.db", label: "Windows thumbnails", enabled: true, is_system: true, description: "Windows thumbnail cache", builtin: true },
  { id: "rule-9", pattern: "**/.vscode/**", label: "VS Code settings", enabled: true, is_system: true, description: "VS Code workspace config", builtin: true },
  { id: "rule-10", pattern: "**/build/**", label: "Build output", enabled: false, is_system: false, description: "Custom build directory", builtin: false },
];

const defaultScanConfig: ScanConfig = {
  recursive: true,
  follow_symlinks: false,
  thread_count: 4,
  max_depth: null,
  min_file_size: null,
  max_file_size: null,
  exclude_system_dirs: true,
};

const mockScanProgress: ScanProgress = {
  session_id: "sess-1",
  scanned_files: 84_700,
  total_files: 284_700,
  scanned_size: 120_000_000_000,
  total_size: 480_000_000_000,
  current_path: "C:\\Projects\\app\\node_modules\\lodash\\dist",
  elapsed_secs: 42,
  eta_secs: 98,
  status: "scanning",
  total_directories: 6_200,
  speed_files_per_sec: 3_500,
  errors: 5,
};

const mockScanResult: ScanResult = {
  id: "result-1",
  volume_id: "volume-1",
  status: "completed",
  total_files: 284_700,
  total_dirs: 18_200,
  total_size: 480_000_000_000,
  scanned_files: 284_700,
  scanned_size: 480_000_000_000,
  errors_count: 12,
  duration_secs: 154,
  started_at: "2026-06-15T17:27:26.000Z",
  completed_at: "2026-06-15T17:30:00.000Z",
  path: "D:\\Projects",
  total_directories: 18_200,
  errors: 12,
};

const mockScanHistory: HistoryItem[] = [
  { id: "hist-001", path: "D:\\Projects", total_files: 284_700, total_size: 480_000_000_000, status: "completed", started_at: "2026-06-15T17:27:26.000Z", completed_at: "2026-06-15T17:30:00.000Z", total_directories: 18_200, duration_secs: 154 },
  { id: "hist-002", path: "C:\\Users\\Lenovo\\Downloads", total_files: 12_500, total_size: 85_000_000_000, status: "completed", started_at: "2026-06-14T10:00:00.000Z", completed_at: "2026-06-14T10:05:00.000Z", total_directories: 850, duration_secs: 300 },
  { id: "hist-003", path: "D:\\Media\\Videos", total_files: 450, total_size: 250_000_000_000, status: "cancelled", started_at: "2026-06-13T15:00:00.000Z", completed_at: "2026-06-13T15:02:00.000Z", total_directories: 25, duration_secs: 120 },
  { id: "hist-004", path: "E:\\Backup\\old-projects", total_files: 180_000, total_size: 350_000_000_000, status: "failed", started_at: "2026-06-12T08:00:00.000Z", completed_at: "2026-06-12T08:01:00.000Z", total_directories: 9_500, duration_secs: 60 },
  { id: "hist-005", path: "C:\\Program Files", total_files: 95_000, total_size: 12_000_000_000, status: "completed", started_at: "2026-06-11T12:00:00.000Z", completed_at: "2026-06-11T12:15:00.000Z", total_directories: 4_200, duration_secs: 900 },
];

describe("DriveSelector", () => {
  it("renders drives", () => {
    render(<DriveSelector drives={mockDrives} selected={null} onSelect={vi.fn()} />);
    expect(screen.getByText("C:\\")).toBeInTheDocument();
    expect(screen.getByText("D:\\")).toBeInTheDocument();
    expect(screen.getByText("E:\\")).toBeInTheDocument();
  });

  it("highlights selected drive", () => {
    render(<DriveSelector drives={mockDrives} selected="D:\\" onSelect={vi.fn()} />);
    expect(screen.getByText("Select Drive")).toBeInTheDocument();
  });

  it("calls onSelect when clicked", async () => {
    const onSelect = vi.fn();
    render(<DriveSelector drives={mockDrives} selected={null} onSelect={onSelect} />);
    await userEvent.click(screen.getByText("C:\\"));
    expect(onSelect).toHaveBeenCalledWith("C:\\");
  });

  it("renders loading state", () => {
    const { container } = render(<DriveSelector drives={[]} selected={null} onSelect={vi.fn()} loading />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders empty state", () => {
    render(<DriveSelector drives={[]} selected={null} onSelect={vi.fn()} />);
    expect(screen.getByText("No drives detected")).toBeInTheDocument();
  });
});

describe("FolderSelector", () => {
  it("renders with path", () => {
    render(<FolderSelector path="D:\\Projects" onPathChange={vi.fn()} />);
    const input = screen.getByPlaceholderText("Select a folder or type a path...") as HTMLInputElement;
    expect(input.value).toContain("Projects");
  });

  it("shows error state", () => {
    render(<FolderSelector path="" onPathChange={vi.fn()} error="Please select a folder" />);
    expect(screen.getByText("Please select a folder")).toBeInTheDocument();
  });

  it("calls onPathChange when quick path clicked", async () => {
    const onPathChange = vi.fn();
    render(<FolderSelector path="" onPathChange={onPathChange} />);
    await userEvent.click(screen.getByText("Home"));
    expect(onPathChange).toHaveBeenCalledWith("C:\\Users\\Lenovo");
  });

  it("renders quick path buttons", () => {
    render(<FolderSelector path="C:\\Users\\Lenovo\\Desktop" onPathChange={vi.fn()} />);
    expect(screen.getByText("Desktop")).toBeInTheDocument();
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Documents")).toBeInTheDocument();
    expect(screen.getByText("Downloads")).toBeInTheDocument();
  });


  it("calls onPathChange on input change", async () => {
    const onPathChange = vi.fn();
    render(<FolderSelector path="" onPathChange={onPathChange} />);
    const input = screen.getByPlaceholderText("Select a folder or type a path...");
    await userEvent.type(input, "C:\\");
    expect(onPathChange).toHaveBeenCalled();
  });

  it("renders loading state", () => {
    const { container } = render(<FolderSelector path="" onPathChange={vi.fn()} loading />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("shows clear button when path is set", () => {
    render(<FolderSelector path="D:\\" onPathChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "" })).toBeInTheDocument();
  });
});

describe("IgnoreRulesPreview", () => {
  it("renders rules", () => {
    render(<IgnoreRulesPreview rules={mockIgnoreRules} onToggle={vi.fn()} />);
    expect(screen.getByText("**/node_modules/**")).toBeInTheDocument();
    expect(screen.getByText("**/target/**")).toBeInTheDocument();
  });

  it("shows active count", () => {
    render(<IgnoreRulesPreview rules={mockIgnoreRules} onToggle={vi.fn()} />);
    expect(screen.getByText(/9 of 10 active/)).toBeInTheDocument();
  });

  it("calls onToggle when toggle clicked", async () => {
    const onToggle = vi.fn();
    render(<IgnoreRulesPreview rules={mockIgnoreRules} onToggle={onToggle} />);
    const toggles = screen.getAllByRole("button");
    const toggleBtn = toggles.find((b) => b.title === "Disable rule" || b.title === "Enable rule");
    if (toggleBtn) await userEvent.click(toggleBtn);
    expect(onToggle).toHaveBeenCalled();
  });

  it("renders loading state", () => {
    const { container } = render(<IgnoreRulesPreview rules={[]} onToggle={vi.fn()} loading />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders empty state", () => {
    render(<IgnoreRulesPreview rules={[]} onToggle={vi.fn()} />);
    expect(screen.getByText("No ignore rules configured")).toBeInTheDocument();
  });

  it("shows add rule button when handler provided", () => {
    render(<IgnoreRulesPreview rules={mockIgnoreRules} onToggle={vi.fn()} onAddRule={vi.fn()} />);
    expect(screen.getByText("Add custom rule")).toBeInTheDocument();
  });

  it("shows built-in badge for built-in rules", () => {
    render(<IgnoreRulesPreview rules={mockIgnoreRules} onToggle={vi.fn()} />);
    const badges = screen.getAllByText("built-in");
    expect(badges.length).toBeGreaterThan(0);
  });
});

describe("ScanOptions", () => {
  it("renders all options", () => {
    render(<ScanOptions config={defaultScanConfig} onChange={vi.fn()} />);
    expect(screen.getByText("Recursive")).toBeInTheDocument();
    expect(screen.getByText("Follow Symlinks")).toBeInTheDocument();
    expect(screen.getByText("Max Depth")).toBeInTheDocument();
    expect(screen.getByText("Min File Size")).toBeInTheDocument();
    expect(screen.getByText("Max File Size")).toBeInTheDocument();
    expect(screen.getByText("Threads")).toBeInTheDocument();
  });

  it("calls onChange when recursive toggled", async () => {
    const onChange = vi.fn();
    render(<ScanOptions config={defaultScanConfig} onChange={onChange} />);
    const checkboxes = screen.getAllByRole("checkbox");
    await userEvent.click(checkboxes[0]);
    expect(onChange).toHaveBeenCalledWith({ recursive: false });
  });

  it("disables follow symlinks when recursive is off", () => {
    const config = { ...defaultScanConfig, recursive: false };
    render(<ScanOptions config={config} onChange={vi.fn()} />);
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes[1]).toBeDisabled();
  });

  it("renders loading state", () => {
    const { container } = render(<ScanOptions config={defaultScanConfig} onChange={vi.fn()} loading />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });
});

describe("ScanControlPanel", () => {
  const noop = vi.fn();

  it("shows Start Scan button when idle", () => {
    render(<ScanControlPanel status="idle" onStart={noop} onPause={noop} onResume={noop} onCancel={noop} />);
    expect(screen.getByText("Start Scan")).toBeInTheDocument();
  });

  it("shows Pause and Cancel when scanning", () => {
    render(<ScanControlPanel status="scanning" onStart={noop} onPause={noop} onResume={noop} onCancel={noop} />);
    expect(screen.getByText("Pause")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("shows Resume and Cancel when paused", () => {
    render(<ScanControlPanel status="paused" onStart={noop} onPause={noop} onResume={noop} onCancel={noop} />);
    expect(screen.getByText("Resume")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("shows Scan Again when completed", () => {
    render(<ScanControlPanel status="completed" onStart={noop} onPause={noop} onResume={noop} onCancel={noop} />);
    expect(screen.getByText("Scan Again")).toBeInTheDocument();
  });

  it("shows Scan Again when failed", () => {
    render(<ScanControlPanel status="failed" onStart={noop} onPause={noop} onResume={noop} onCancel={noop} />);
    expect(screen.getByText("Scan Again")).toBeInTheDocument();
  });

  it("disables button when disabled prop is set", () => {
    render(<ScanControlPanel status="idle" onStart={noop} onPause={noop} onResume={noop} onCancel={noop} disabled />);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("calls onStart when Start Scan clicked", async () => {
    const onStart = vi.fn();
    render(<ScanControlPanel status="idle" onStart={onStart} onPause={noop} onResume={noop} onCancel={noop} />);
    await userEvent.click(screen.getByText("Start Scan"));
    expect(onStart).toHaveBeenCalledOnce();
  });

  it("calls onPause when Pause clicked", async () => {
    const onPause = vi.fn();
    render(<ScanControlPanel status="scanning" onStart={noop} onPause={onPause} onResume={noop} onCancel={noop} />);
    await userEvent.click(screen.getByText("Pause"));
    expect(onPause).toHaveBeenCalledOnce();
  });

  it("calls onCancel when Cancel clicked", async () => {
    const onCancel = vi.fn();
    render(<ScanControlPanel status="scanning" onStart={noop} onPause={noop} onResume={noop} onCancel={onCancel} />);
    await userEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("renders loading state", () => {
    const { container } = render(<ScanControlPanel status="idle" onStart={noop} onPause={noop} onResume={noop} onCancel={noop} loading />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("shows status badge with correct status text", () => {
    render(<ScanControlPanel status="scanning" onStart={noop} onPause={noop} onResume={noop} onCancel={noop} />);
    expect(screen.getByText("Scanning")).toBeInTheDocument();
  });
});

describe("ScanProgressSection", () => {
  it("renders with scanning progress", () => {
    render(<ScanProgressSection progress={mockScanProgress} />);
    expect(screen.getByText("Scan Progress")).toBeInTheDocument();
    expect(screen.getByText("84.7K")).toBeInTheDocument();
    expect(screen.getByText("6.2K")).toBeInTheDocument();
  });

  it("shows current file path", () => {
    render(<ScanProgressSection progress={mockScanProgress} />);
    expect(screen.getByText("Current file")).toBeInTheDocument();
    expect(screen.getByText(/node_modules/)).toBeInTheDocument();
  });

  it("shows speed", () => {
    render(<ScanProgressSection progress={mockScanProgress} />);
    expect(screen.getByText("3.5K files/s")).toBeInTheDocument();
  });

  it("shows error count when errors > 0", () => {
    render(<ScanProgressSection progress={mockScanProgress} />);
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("renders null when no progress data", () => {
    const { container } = render(<ScanProgressSection progress={null} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders loading state", () => {
    const { container } = render(<ScanProgressSection progress={null} loading />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });
});

describe("ScanResultSummary", () => {
  it("renders with result data", () => {
    render(<ScanResultSummary result={mockScanResult} />);
    expect(screen.getByText("Scan Results")).toBeInTheDocument();
    expect(screen.getByText("284.7K")).toBeInTheDocument();
    expect(screen.getByText("18.2K")).toBeInTheDocument();
    expect(screen.getByText("447.0 GB")).toBeInTheDocument();
    expect(screen.getByText("2m 34s")).toBeInTheDocument();
  });

  it("shows completed status", () => {
    render(<ScanResultSummary result={mockScanResult} />);
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("shows cancelled status", () => {
    render(<ScanResultSummary result={{ ...mockScanResult, status: "cancelled", completed_at: "2026-06-15T17:28:00.000Z" }} />);
    expect(screen.getByText("Cancelled")).toBeInTheDocument();
  });

  it("shows failed status", () => {
    render(<ScanResultSummary result={{ ...mockScanResult, status: "failed", completed_at: "2026-06-15T17:28:00.000Z" }} />);
    expect(screen.getByText("Failed")).toBeInTheDocument();
  });

  it("renders null when no result", () => {
    const { container } = render(<ScanResultSummary result={null} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders loading state", () => {
    const { container } = render(<ScanResultSummary result={null} loading />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("shows error count when errors > 0", () => {
    render(<ScanResultSummary result={mockScanResult} />);
    expect(screen.getByText("12")).toBeInTheDocument();
  });
});

describe("RecentScanHistory", () => {
  it("renders history items", () => {
    render(<RecentScanHistory history={mockScanHistory} />);
    expect(screen.getByText("D:\\Projects")).toBeInTheDocument();
    expect(screen.getByText("284.7K")).toBeInTheDocument();
    expect(screen.getByText("5 scans")).toBeInTheDocument();
  });

  it("calls onSelect when clicked", async () => {
    const onSelect = vi.fn();
    render(<RecentScanHistory history={mockScanHistory} onSelect={onSelect} />);
    await userEvent.click(screen.getByText("D:\\Projects"));
    expect(onSelect).toHaveBeenCalledWith("hist-001");
  });

  it("highlights selected item", () => {
    render(<RecentScanHistory history={mockScanHistory} selectedId="hist-002" />);
    const buttons = screen.getAllByRole("button");
    const selectedBtn = buttons.find((b) => b.classList.contains("border-emerald-300"));
    expect(selectedBtn).toBeInTheDocument();
  });

  it("renders empty state", () => {
    render(<RecentScanHistory history={[]} />);
    expect(screen.getByText("No scan history")).toBeInTheDocument();
  });

  it("renders loading state", () => {
    const { container } = render(<RecentScanHistory history={[]} loading />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("shows status icons for different statuses", () => {
    render(<RecentScanHistory history={mockScanHistory} />);
    const completedItems = screen.getAllByText("completed");
    expect(completedItems.length).toBeGreaterThan(0);
    expect(screen.getByText("cancelled")).toBeInTheDocument();
  });
});
