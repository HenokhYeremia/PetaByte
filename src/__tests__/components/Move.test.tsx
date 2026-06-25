import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { MoveSummarySection } from "@/components/move/MoveSummarySection";
import { DestinationSelector } from "@/components/move/DestinationSelector";
import { MovePreviewSection } from "@/components/move/MovePreviewSection";
import { ConflictResolution } from "@/components/move/ConflictResolution";
import { MoveExecutionPanel } from "@/components/move/MoveExecutionPanel";
import { UndoCenterPreview } from "@/components/move/UndoCenterPreview";
import type { MoveOperation, MoveProgress, UndoJournalEntry, SuggestedLocation, RecentDestination, MoveFilterState } from "@/types";

type MoveStatus = "idle" | "previewing" | "ready" | "moving" | "paused" | "completed" | "cancelled" | "failed";

const mockMoveOperations: MoveOperation[] = [
  { id: "op-1", source: "D:\\Downloads\\project-backup-2026-06.zip", destination: "D:\\Archive\\project-backup-2026-06.zip", size: 250_000_000, method: "rename", conflict_status: "exists", validation_status: "valid", resolution: "keep_both", source_name: "project-backup-2026-06.zip", dest_name: "project-backup-2026-06 (copy).zip" },
  { id: "op-2", source: "D:\\Downloads\\demo-recording-2026.mp4", destination: "D:\\Archive\\demo-recording-2026.mp4", size: 1_200_000_000, method: "rename", conflict_status: "none", validation_status: "valid", resolution: "rename", source_name: "demo-recording-2026.mp4", dest_name: "demo-recording-2026.mp4" },
  { id: "op-3", source: "D:\\Downloads\\old-screenshots", destination: "D:\\Archive\\old-screenshots", size: 450_000_000, method: "copy_delete", conflict_status: "exists", validation_status: "valid", resolution: "keep_both", source_name: "old-screenshots", dest_name: "old-screenshots" },
  { id: "op-4", source: "D:\\Downloads\\node_modules_backup", destination: "D:\\Archive\\node_modules_backup", size: 520_000_000, method: "rename", conflict_status: "none", validation_status: "valid", resolution: "rename", source_name: "node_modules_backup", dest_name: "node_modules_backup" },
  { id: "op-5", source: "D:\\Downloads\\config-backup.json", destination: "D:\\Archive\\config-backup.json", size: 1_200_000, method: "rename", conflict_status: "none", validation_status: "valid", resolution: "rename", source_name: "config-backup.json", dest_name: "config-backup.json" },
];

const mockMoveProgress: MoveProgress = {
  current_file: "D:\\Downloads\\project-backup-2026-06.zip",
  bytes_copied: 500_000_000,
  total_bytes: 2_421_200_000,
  files_completed: 2,
  total_files: 5,
  phase: "moving",
  percentage: 20.6,
  moved_files: 2,
  moved_bytes: 500_000_000,
  elapsed_secs: 14,
  eta_secs: 72,
};

const mockUndoJournal: UndoJournalEntry[] = [
  { id: "undo-1", operation_type: "move", source_path: "D:\\Downloads\\project-backup-2026-06.zip", destination_path: "D:\\Archive\\project-backup-2026-06.zip", size: 250_000_000, status: "available", timestamp: "2026-06-15T17:30:00.000Z", checksum_before: "abc123", checksum_after: "abc123", started_at: "2026-06-15T17:30:00.000Z", source_root: "D:\\Downloads", dest_root: "D:\\Archive", operation_count: 5, total_bytes: 2_421_200_000, journal_path: "C:\\Users\\Lenovo\\.petabyte\\journal\\undo-1.json" },
  { id: "undo-2", operation_type: "move", source_path: "D:\\Media\\Videos\\demo-recording-2026.mp4", destination_path: "D:\\Media\\Organized\\demo-recording-2026.mp4", size: 1_200_000_000, status: "available", timestamp: "2026-06-14T10:00:00.000Z", checksum_before: "def456", checksum_after: "def456", started_at: "2026-06-14T10:00:00.000Z", source_root: "D:\\Media\\Videos", dest_root: "D:\\Media\\Organized", operation_count: 3, total_bytes: 2_100_000_000, journal_path: "C:\\Users\\Lenovo\\.petabyte\\journal\\undo-2.json" },
  { id: "undo-3", operation_type: "move", source_path: "C:\\Users\\Lenovo\\Desktop\\old-resume.docx", destination_path: "D:\\Archive\\resumes\\old-resume.docx", size: 500_000, status: "used", timestamp: "2026-06-10T08:00:00.000Z", checksum_before: "ghi789", checksum_after: "ghi789", started_at: "2026-06-10T08:00:00.000Z", source_root: "C:\\Users\\Lenovo\\Desktop", dest_root: "D:\\Archive\\resumes", operation_count: 1, total_bytes: 500_000, journal_path: "C:\\Users\\Lenovo\\.petabyte\\journal\\undo-3.json" },
  { id: "undo-4", operation_type: "move", source_path: "D:\\Downloads\\archived-project.zip", destination_path: "E:\\ColdStorage\\archived-project.zip", size: 5_000_000_000, status: "expired", timestamp: "2026-05-01T12:00:00.000Z", checksum_before: "jkl012", checksum_after: "jkl012", started_at: "2026-05-01T12:00:00.000Z", source_root: "D:\\Downloads", dest_root: "E:\\ColdStorage", operation_count: 1, total_bytes: 5_000_000_000, journal_path: "C:\\Users\\Lenovo\\.petabyte\\journal\\undo-4.json" },
];

const mockSuggestedLocations: SuggestedLocation[] = [
  { id: "loc-1", path: "D:\\Archive", label: "Archive Folder", free_space: 400_000_000_000, type: "folder" },
  { id: "loc-2", path: "D:\\Media\\Organized", label: "Organized Videos", free_space: 300_000_000_000, type: "smart" },
  { id: "loc-3", path: "E:\\Backup", label: "Backup Drive", free_space: 1_500_000_000_000, type: "volume" },
];

const mockRecentDestinations: RecentDestination[] = [
  { id: "rd-1", path: "D:\\Archive\\Projects", label: "D:\\Archive\\Projects", last_used: "2026-06-15T17:30:00.000Z", count: 5, move_count: 5 },
  { id: "rd-2", path: "D:\\Media\\Organized", label: "D:\\Media\\Organized", last_used: "2026-06-14T10:00:00.000Z", count: 3, move_count: 3 },
];

const defaultFilterState: MoveFilterState = {
  search: "",
  statusFilter: "all",
  conflictFilter: "all",
  validationFilter: "all",
};

describe("MoveSummarySection", () => {
  const defaultProps = { selectedFiles: 5, totalSize: 4_046_000_000, estimatedSavings: 3_439_100_000 };

  it("renders selected files count", () => {
    render(<MoveSummarySection {...defaultProps} />);
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("renders total size", () => {
    render(<MoveSummarySection {...defaultProps} />);
    expect(screen.getByText("3.8 GB")).toBeInTheDocument();
  });

  it("renders estimated savings", () => {
    render(<MoveSummarySection {...defaultProps} />);
    expect(screen.getByText("3.2 GB")).toBeInTheDocument();
  });

  it("renders loading state", () => {
    const { container } = render(<MoveSummarySection selectedFiles={0} totalSize={0} estimatedSavings={0} loading />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });
});

describe("DestinationSelector", () => {
  const defaultProps = {
    destination: "",
    destinationError: null,
    suggestedLocations: mockSuggestedLocations,
    recentDestinations: mockRecentDestinations,
    onDestinationChange: vi.fn(),
    onBrowse: vi.fn(),
    onClear: vi.fn(),
  };

  it("renders input with placeholder", () => {
    render(<DestinationSelector {...defaultProps} />);
    expect(screen.getByPlaceholderText("Select destination folder...")).toBeInTheDocument();
  });

  it("renders suggested locations", () => {
    render(<DestinationSelector {...defaultProps} />);
    expect(screen.getByText("Archive Folder")).toBeInTheDocument();
    expect(screen.getByText("Organized Videos")).toBeInTheDocument();
  });

  it("renders recent destinations", () => {
    render(<DestinationSelector {...defaultProps} />);
    expect(screen.getByText("D:\\Archive\\Projects")).toBeInTheDocument();
  });

  it("calls onDestinationChange on input", async () => {
    const onChange = vi.fn();
    render(<DestinationSelector {...defaultProps} onDestinationChange={onChange} />);
    const input = screen.getByPlaceholderText("Select destination folder...");
    await userEvent.type(input, "D:\\Test");
    expect(onChange).toHaveBeenCalled();
  });

  it("calls onBrowse on button click", async () => {
    const onBrowse = vi.fn();
    render(<DestinationSelector {...defaultProps} onBrowse={onBrowse} />);
    await userEvent.click(screen.getByText("Browse"));
    expect(onBrowse).toHaveBeenCalledOnce();
  });

  it("shows clear button when destination is set", () => {
    render(<DestinationSelector {...defaultProps} destination="D:\\Test" />);
    expect(screen.getByRole("button", { name: "" })).toBeInTheDocument();
  });

  it("calls onClear on clear button click", async () => {
    const onClear = vi.fn();
    render(<DestinationSelector {...defaultProps} destination="D:\\Test" onClear={onClear} />);
    const clearBtn = screen.getAllByRole("button").find((b) => b.querySelector("svg"));
    if (clearBtn) await userEvent.click(clearBtn);
    expect(onClear).toHaveBeenCalledOnce();
  });

  it("displays destination error", () => {
    render(<DestinationSelector {...defaultProps} destinationError="Invalid path" />);
    expect(screen.getByText("Invalid path")).toBeInTheDocument();
  });

  it("shows empty state when no suggestions or recent", () => {
    render(
      <DestinationSelector
        {...defaultProps}
        suggestedLocations={[]}
        recentDestinations={[]}
      />,
    );
    expect(screen.getByText("No suggested destinations")).toBeInTheDocument();
  });

  it("renders loading state", () => {
    const { container } = render(
      <DestinationSelector {...defaultProps} loading suggestedLocations={[]} recentDestinations={[]} />,
    );
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("clicking a suggested location calls onDestinationChange", async () => {
    const onChange = vi.fn();
    render(<DestinationSelector {...defaultProps} onDestinationChange={onChange} />);
    await userEvent.click(screen.getByText("Archive Folder"));
    expect(onChange).toHaveBeenCalledWith("D:\\Archive");
  });
});

describe("MovePreviewSection", () => {
  const defaultProps = {
    operations: mockMoveOperations,
    filter: defaultFilterState,
    onFilterChange: vi.fn(),
    onSetResolution: vi.fn(),
    onSetAllResolutions: vi.fn(),
  };

  it("renders operation count", () => {
    render(<MovePreviewSection {...defaultProps} />);
    expect(screen.getByText(/5 of 5 operations/)).toBeInTheDocument();
  });

  it("renders search input", () => {
    render(<MovePreviewSection {...defaultProps} />);
    expect(screen.getByPlaceholderText("Search files...")).toBeInTheDocument();
  });

  it("renders all source names", () => {
    render(<MovePreviewSection {...defaultProps} />);
    expect(screen.getAllByText("project-backup-2026-06.zip").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("demo-recording-2026.mp4").length).toBeGreaterThanOrEqual(1);
  });

  it("filters by search query", () => {
    render(
      <MovePreviewSection
        {...defaultProps}
        filter={{ search: "demo", statusFilter: "all", conflictFilter: "all", validationFilter: "all" }}
      />,
    );
    expect(screen.getByText(/1 of 5 operations/)).toBeInTheDocument();
    expect(screen.getAllByText("demo-recording-2026.mp4").length).toBeGreaterThanOrEqual(1);
  });

  it("filters by conflict status", () => {
    render(
      <MovePreviewSection
        {...defaultProps}
        filter={{ search: "", statusFilter: "all", conflictFilter: "exists", validationFilter: "all" }}
      />,
    );
    expect(screen.getAllByText("project-backup-2026-06 (copy).zip").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/2 of 5 operations/)).toBeInTheDocument();
  });

  it("calls onFilterChange on search input", async () => {
    const onFilterChange = vi.fn();
    render(<MovePreviewSection {...defaultProps} onFilterChange={onFilterChange} />);
    const input = screen.getByPlaceholderText("Search files...");
    await userEvent.type(input, "x");
    expect(onFilterChange).toHaveBeenCalled();
  });

  it("calls onSetResolution on action select", async () => {
    const onSetResolution = vi.fn();
    render(<MovePreviewSection {...defaultProps} onSetResolution={onSetResolution} />);
    const selects = screen.getAllByRole("combobox");
    const actionSelect = selects[2];
    await userEvent.selectOptions(actionSelect, "skip");
    expect(onSetResolution).toHaveBeenCalledWith("op-1", "skip");
  });

  it("renders loading state", () => {
    const { container } = render(
      <MovePreviewSection {...defaultProps} operations={[]} loading />,
    );
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders empty state when no operations", () => {
    render(<MovePreviewSection {...defaultProps} operations={[]} />);
    expect(screen.getByText("No operations to preview")).toBeInTheDocument();
  });
});

describe("ConflictResolution", () => {
  const defaultProps = {
    operations: mockMoveOperations,
    onSetResolution: vi.fn(),
    onSetAllResolutions: vi.fn(),
  };

  it("renders conflict count", () => {
    render(<ConflictResolution {...defaultProps} />);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("renders conflict card for each conflict", () => {
    render(<ConflictResolution {...defaultProps} />);
    expect(screen.getByText("project-backup-2026-06.zip")).toBeInTheDocument();
    expect(screen.getByText("old-screenshots")).toBeInTheDocument();
  });

  it("calls onSetAllResolutions on Keep All", async () => {
    const onSetAll = vi.fn();
    render(<ConflictResolution {...defaultProps} onSetAllResolutions={onSetAll} />);
    await userEvent.click(screen.getByText("Keep All"));
    expect(onSetAll).toHaveBeenCalledWith("keep_both");
  });

  it("calls onSetAllResolutions on Replace All", async () => {
    const onSetAll = vi.fn();
    render(<ConflictResolution {...defaultProps} onSetAllResolutions={onSetAll} />);
    await userEvent.click(screen.getByText("Replace All"));
    expect(onSetAll).toHaveBeenCalledWith("replace");
  });

  it("calls onSetAllResolutions on Skip All", async () => {
    const onSetAll = vi.fn();
    render(<ConflictResolution {...defaultProps} onSetAllResolutions={onSetAll} />);
    await userEvent.click(screen.getByText("Skip All"));
    expect(onSetAll).toHaveBeenCalledWith("skip");
  });

  it("calls onSetResolution on inline button click", async () => {
    const onSet = vi.fn();
    render(<ConflictResolution {...defaultProps} onSetResolution={onSet} />);
    const replaceBtns = screen.getAllByText("Replace");
    await userEvent.click(replaceBtns[0]);
    expect(onSet).toHaveBeenCalledWith(expect.any(String), "replace");
  });

  it("renders loading state", () => {
    const { container } = render(
      <ConflictResolution {...defaultProps} operations={[]} loading />,
    );
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders empty state when no conflicts", () => {
    const noConflicts: MoveOperation[] = mockMoveOperations.map((op) => ({
      ...op,
      conflict_status: "none" as MoveOperation["conflict_status"],
      validation_status: "valid" as MoveOperation["validation_status"],
    }));
    render(<ConflictResolution {...defaultProps} operations={noConflicts} />);
    expect(screen.getByText("No conflicts detected")).toBeInTheDocument();
  });
});

describe("MoveExecutionPanel", () => {
  const defaultProps = {
    status: "idle" as MoveStatus,
    progress: null,
    onStart: vi.fn(),
    onCancel: vi.fn(),
    onPause: vi.fn(),
    onResume: vi.fn(),
  };

  it("renders Start Move button in idle state", () => {
    render(<MoveExecutionPanel {...defaultProps} />);
    expect(screen.getByText("Start Move")).toBeInTheDocument();
  });

  it("shows idle empty state when no progress", () => {
    render(<MoveExecutionPanel {...defaultProps} />);
    expect(screen.getByText("Configure and preview to start moving files")).toBeInTheDocument();
  });

  it("calls onStart on click", async () => {
    const onStart = vi.fn();
    render(<MoveExecutionPanel {...defaultProps} onStart={onStart} />);
    await userEvent.click(screen.getByText("Start Move"));
    expect(onStart).toHaveBeenCalledOnce();
  });

  it("disables Start Move when disabled prop is true", () => {
    render(<MoveExecutionPanel {...defaultProps} disabled />);
    expect(screen.getByText("Start Move").closest("button")).toBeDisabled();
  });

  it("shows Pause and Cancel in moving state", () => {
    render(
      <MoveExecutionPanel
        {...defaultProps}
        status="moving"
        progress={mockMoveProgress}
      />,
    );
    expect(screen.getByText("Pause")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("shows Moving status badge", () => {
    render(
      <MoveExecutionPanel
        {...defaultProps}
        status="moving"
        progress={mockMoveProgress}
      />,
    );
    expect(screen.getByText("Moving")).toBeInTheDocument();
  });

  it("shows progress bar in moving state", () => {
    render(
      <MoveExecutionPanel
        {...defaultProps}
        status="moving"
        progress={mockMoveProgress}
      />,
    );
    expect(screen.getByText(/2 of 5 files/)).toBeInTheDocument();
  });

  it("shows elapsed and ETA", () => {
    render(
      <MoveExecutionPanel
        {...defaultProps}
        status="moving"
        progress={mockMoveProgress}
      />,
    );
    expect(screen.getByText(/Elapsed: 14s/)).toBeInTheDocument();
    expect(screen.getByText(/ETA: 1m 12s/)).toBeInTheDocument();
  });

  it("shows current file path", () => {
    render(
      <MoveExecutionPanel
        {...defaultProps}
        status="moving"
        progress={mockMoveProgress}
      />,
    );
    expect(screen.getByText(mockMoveProgress.current_file!)).toBeInTheDocument();
  });

  it("shows Resume and Cancel in paused state", () => {
    render(
      <MoveExecutionPanel
        {...defaultProps}
        status="paused"
        progress={{ ...mockMoveProgress, phase: "paused" }}
      />,
    );
    expect(screen.getByText("Resume")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("shows Paused status badge", () => {
    render(
      <MoveExecutionPanel
        {...defaultProps}
        status="paused"
        progress={{ ...mockMoveProgress, phase: "paused" }}
      />,
    );
    expect(screen.getByText("Paused")).toBeInTheDocument();
  });

  it("shows Start New in completed state", () => {
    render(
      <MoveExecutionPanel
        {...defaultProps}
        status="completed"
        progress={{ ...mockMoveProgress, phase: "completed" }}
      />,
    );
    expect(screen.getByText("Start New")).toBeInTheDocument();
  });

  it("shows Completed badge", () => {
    render(
      <MoveExecutionPanel
        {...defaultProps}
        status="completed"
        progress={{ ...mockMoveProgress, phase: "completed" }}
      />,
    );
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("shows Cancelled badge", () => {
    render(
      <MoveExecutionPanel
        {...defaultProps}
        status="cancelled"
      />,
    );
    expect(screen.getByText("Cancelled")).toBeInTheDocument();
  });

  it("shows Failed badge", () => {
    render(
      <MoveExecutionPanel
        {...defaultProps}
        status="failed"
      />,
    );
    expect(screen.getByText("Failed")).toBeInTheDocument();
  });

  it("renders loading state", () => {
    const { container } = render(<MoveExecutionPanel {...defaultProps} loading />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("calls onPause on pause click", async () => {
    const onPause = vi.fn();
    render(
      <MoveExecutionPanel
        {...defaultProps}
        status="moving"
        progress={mockMoveProgress}
        onPause={onPause}
      />,
    );
    await userEvent.click(screen.getByText("Pause"));
    expect(onPause).toHaveBeenCalledOnce();
  });

  it("calls onCancel on cancel click", async () => {
    const onCancel = vi.fn();
    render(
      <MoveExecutionPanel
        {...defaultProps}
        status="moving"
        progress={mockMoveProgress}
        onCancel={onCancel}
      />,
    );
    await userEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("calls onResume on resume click", async () => {
    const onResume = vi.fn();
    render(
      <MoveExecutionPanel
        {...defaultProps}
        status="paused"
        progress={{ ...mockMoveProgress, phase: "paused" }}
        onResume={onResume}
      />,
    );
    await userEvent.click(screen.getByText("Resume"));
    expect(onResume).toHaveBeenCalledOnce();
  });
});

describe("UndoCenterPreview", () => {
  const defaultProps = {
    entries: mockUndoJournal,
    selectedId: null,
    onSelect: vi.fn(),
  };

  it("renders available count badge", () => {
    render(<UndoCenterPreview {...defaultProps} />);
    expect(screen.getByText("2 available")).toBeInTheDocument();
  });

  it("renders all journal entries", () => {
    render(<UndoCenterPreview {...defaultProps} />);
    expect(screen.getByText(/D:\\Downloads → D:\\Archive/)).toBeInTheDocument();
    expect(screen.getByText(/D:\\Media\\Videos → D:\\Media\\Organized/)).toBeInTheDocument();
  });

  it("renders status badges", () => {
    render(<UndoCenterPreview {...defaultProps} />);
    expect(screen.getAllByText("Available").length).toBe(2);
    expect(screen.getByText("Used")).toBeInTheDocument();
    expect(screen.getByText("Expired")).toBeInTheDocument();
  });

  it("shows journal detail when selected", () => {
    render(
      <UndoCenterPreview
        {...defaultProps}
        selectedId="undo-1"
      />,
    );
    expect(screen.getByText(/Journal: C:\\Users\\Lenovo\\.petabyte\\journal\\undo-1.json/)).toBeInTheDocument();
  });

  it("hides journal detail when deselected", () => {
    render(<UndoCenterPreview {...defaultProps} />);
    expect(screen.queryByText(/Journal:/)).not.toBeInTheDocument();
  });

  it("calls onSelect when entry is clicked", async () => {
    const onSelect = vi.fn();
    render(<UndoCenterPreview {...defaultProps} onSelect={onSelect} />);
    const entries = screen.getAllByRole("button");
    await userEvent.click(entries[0]);
    expect(onSelect).toHaveBeenCalledWith("undo-1");
  });

  it("calls onSelect with null when already selected entry is clicked", async () => {
    const onSelect = vi.fn();
    render(<UndoCenterPreview {...defaultProps} selectedId="undo-1" onSelect={onSelect} />);
    const entries = screen.getAllByRole("button");
    await userEvent.click(entries[0]);
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it("renders loading state", () => {
    const { container } = render(
      <UndoCenterPreview {...defaultProps} entries={[]} loading />,
    );
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders empty state when no entries", () => {
    render(<UndoCenterPreview {...defaultProps} entries={[]} />);
    expect(screen.getByText("No recent operations")).toBeInTheDocument();
  });
});
