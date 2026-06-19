import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { MoveSummarySection } from "@/components/move/MoveSummarySection";
import { DestinationSelector } from "@/components/move/DestinationSelector";
import { MovePreviewSection } from "@/components/move/MovePreviewSection";
import { ConflictResolution } from "@/components/move/ConflictResolution";
import { MoveExecutionPanel } from "@/components/move/MoveExecutionPanel";
import { UndoCenterPreview } from "@/components/move/UndoCenterPreview";
import {
  mockMoveOperations,
  mockMoveProgress,
  mockUndoJournal,
  mockSuggestedLocations,
  mockRecentDestinations,
  defaultFilterState,
} from "@/mocks/move";
import type { MockMoveOperation } from "@/mocks/move";
import type { MoveStatus } from "@/stores/moveStore";

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
        filter={{ search: "demo", conflictFilter: "all", validationFilter: "all" }}
      />,
    );
    expect(screen.getByText(/1 of 5 operations/)).toBeInTheDocument();
    expect(screen.getAllByText("demo-recording-2026.mp4").length).toBeGreaterThanOrEqual(1);
  });

  it("filters by conflict status", () => {
    render(
      <MovePreviewSection
        {...defaultProps}
        filter={{ search: "", conflictFilter: "exists", validationFilter: "all" }}
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
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders conflict card for each conflict", () => {
    render(<ConflictResolution {...defaultProps} />);
    expect(screen.getByText("project-backup-2026-06 (copy).zip")).toBeInTheDocument();
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
    const noConflicts: MockMoveOperation[] = mockMoveOperations.map((op) => ({
      ...op,
      conflict_status: "none" as const,
      validation_status: "valid" as const,
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
        progress={{ ...mockMoveProgress, status: "paused" }}
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
        progress={{ ...mockMoveProgress, status: "paused" }}
      />,
    );
    expect(screen.getByText("Paused")).toBeInTheDocument();
  });

  it("shows Start New in completed state", () => {
    render(
      <MoveExecutionPanel
        {...defaultProps}
        status="completed"
        progress={{ ...mockMoveProgress, status: "completed" }}
      />,
    );
    expect(screen.getByText("Start New")).toBeInTheDocument();
  });

  it("shows Completed badge", () => {
    render(
      <MoveExecutionPanel
        {...defaultProps}
        status="completed"
        progress={{ ...mockMoveProgress, status: "completed" }}
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
        progress={{ ...mockMoveProgress, status: "paused" }}
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
