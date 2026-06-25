import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { DuplicateSummarySection } from "@/components/duplicates/DuplicateSummarySection";
import { SearchAndFilter } from "@/components/duplicates/SearchAndFilter";
import { DuplicateGroupList } from "@/components/duplicates/DuplicateGroupList";
import { DuplicateDetailsPanel } from "@/components/duplicates/DuplicateDetailsPanel";
import { DuplicateActions } from "@/components/duplicates/DuplicateActions";
import type { DuplicateSummary, DuplicateFilterState, DuplicateSortConfig, DuplicateGroup, DuplicateFile } from "@/types";

const mockDuplicateSummary: DuplicateSummary = {
  total_groups: 7,
  total_files: 58,
  total_wasted_bytes: 1_700_000_000,
  potential_savings: 1_700_000_000,
  scan_session_id: "session-1",
  group_count: 7,
  total_duplicate_files: 58,
  total_files_scan: 284_700,
  scanned_at: "2026-06-15T17:30:00.000Z",
};

const mockFiles1: DuplicateFile[] = [
  { id: "f1", path: "C:\\Projects\\app\\node_modules\\lodash\\lodash.min.js", name: "lodash.min.js", hash: "abc123...", size: 43_700_000, modified_at: "2026-05-10T12:00:00.000Z", is_kept: false, is_selected: false, file_name: "lodash.min.js", file_path: "C:\\Projects\\app\\node_modules\\lodash\\lodash.min.js", file_size: 43_700_000, hash_status: "full" },
  { id: "f2", path: "C:\\Projects\\backup\\node_modules\\lodash\\lodash.min.js", name: "lodash.min.js", hash: "abc123...", size: 43_700_000, modified_at: "2026-05-10T12:00:00.000Z", is_kept: false, is_selected: false, file_name: "lodash.min.js", file_path: "C:\\Projects\\backup\\node_modules\\lodash\\lodash.min.js", file_size: 43_700_000, hash_status: "full" },
  { id: "f3", path: "D:\\archive\\node_modules\\lodash\\lodash.min.js", name: "lodash.min.js", hash: "abc123...", size: 43_700_000, modified_at: "2026-05-10T12:00:00.000Z", is_kept: false, is_selected: false, file_name: "lodash.min.js", file_path: "D:\\archive\\node_modules\\lodash\\lodash.min.js", file_size: 43_700_000, hash_status: "full" },
  { id: "f4", path: "C:\\Projects\\app\\node_modules\\lodash\\lodash.min.js", name: "lodash.min.js", hash: "abc123...", size: 43_700_000, modified_at: "2026-05-10T12:00:00.000Z", is_kept: false, is_selected: false, file_name: "lodash.min.js", file_path: "C:\\Projects\\app\\node_modules\\lodash\\lodash.min.js", file_size: 43_700_000, hash_status: "full" },
  { id: "f5", path: "C:\\Projects\\app\\node_modules\\lodash\\lodash.min.js", name: "lodash.min.js", hash: "abc123...", size: 43_700_000, modified_at: "2026-05-10T12:00:00.000Z", is_kept: false, is_selected: false, file_name: "lodash.min.js", file_path: "C:\\Projects\\app\\node_modules\\lodash\\lodash.min.js", file_size: 43_700_000, hash_status: "full" },
  { id: "f6", path: "C:\\Projects\\app\\node_modules\\lodash\\lodash.min.js", name: "lodash.min.js", hash: "abc123...", size: 43_700_000, modified_at: "2026-05-10T12:00:00.000Z", is_kept: false, is_selected: false, file_name: "lodash.min.js", file_path: "C:\\Projects\\app\\node_modules\\lodash\\lodash.min.js", file_size: 43_700_000, hash_status: "full" },
  { id: "f7", path: "C:\\Projects\\app\\node_modules\\lodash\\lodash.min.js", name: "lodash.min.js", hash: "abc123...", size: 43_700_000, modified_at: "2026-05-10T12:00:00.000Z", is_kept: false, is_selected: false, file_name: "lodash.min.js", file_path: "C:\\Projects\\app\\node_modules\\lodash\\lodash.min.js", file_size: 43_700_000, hash_status: "full" },
  { id: "f8", path: "C:\\Projects\\app\\node_modules\\lodash\\lodash.min.js", name: "lodash.min.js", hash: "abc123...", size: 43_700_000, modified_at: "2026-05-10T12:00:00.000Z", is_kept: false, is_selected: false, file_name: "lodash.min.js", file_path: "C:\\Projects\\app\\node_modules\\lodash\\lodash.min.js", file_size: 43_700_000, hash_status: "full" },
  { id: "f9", path: "C:\\Projects\\app\\node_modules\\lodash\\lodash.min.js", name: "lodash.min.js", hash: "abc123...", size: 43_700_000, modified_at: "2026-05-10T12:00:00.000Z", is_kept: false, is_selected: false, file_name: "lodash.min.js", file_path: "C:\\Projects\\app\\node_modules\\lodash\\lodash.min.js", file_size: 43_700_000, hash_status: "full" },
  { id: "f10", path: "C:\\Projects\\app\\node_modules\\lodash\\lodash.min.js", name: "lodash.min.js", hash: "abc123...", size: 43_700_000, modified_at: "2026-05-10T12:00:00.000Z", is_kept: false, is_selected: false, file_name: "lodash.min.js", file_path: "C:\\Projects\\app\\node_modules\\lodash\\lodash.min.js", file_size: 43_700_000, hash_status: "full" },
  { id: "f11", path: "C:\\Projects\\app\\node_modules\\lodash\\lodash.min.js", name: "lodash.min.js", hash: "abc123...", size: 43_700_000, modified_at: "2026-05-10T12:00:00.000Z", is_kept: false, is_selected: false, file_name: "lodash.min.js", file_path: "C:\\Projects\\app\\node_modules\\lodash\\lodash.min.js", file_size: 43_700_000, hash_status: "full" },
  { id: "f12", path: "C:\\Projects\\app\\node_modules\\lodash\\lodash.min.js", name: "lodash.min.js", hash: "abc123...", size: 43_700_000, modified_at: "2026-05-10T12:00:00.000Z", is_kept: false, is_selected: false, file_name: "lodash.min.js", file_path: "C:\\Projects\\app\\node_modules\\lodash\\lodash.min.js", file_size: 43_700_000, hash_status: "full" },
];

const mockDuplicateGroups: DuplicateGroup[] = [
  { id: "dup-001", file_size: 43_700_000, file_count: 12, total_wasted_bytes: 480_500_000, files: mockFiles1, common_parent: "node_modules\\lodash" },
  { id: "dup-002", file_size: 1_200_000, file_count: 8, total_wasted_bytes: 8_400_000, files: [
    { id: "g2f1", path: "C:\\Projects\\app\\README.md", name: "README.md", hash: "def456", size: 1_200_000, modified_at: "2026-04-01T10:00:00.000Z", is_kept: false, is_selected: false, file_name: "README.md", file_path: "C:\\Projects\\app\\README.md", file_size: 1_200_000, hash_status: "partial" },
    { id: "g2f2", path: "C:\\Projects\\backup\\README.md", name: "README.md", hash: "def456", size: 1_200_000, modified_at: "2026-04-01T10:00:00.000Z", is_kept: false, is_selected: false, file_name: "README.md", file_path: "C:\\Projects\\backup\\README.md", file_size: 1_200_000, hash_status: "partial" },
  ], common_parent: "Projects" },
  { id: "dup-003", file_size: 52_000_000, file_count: 5, total_wasted_bytes: 208_000_000, files: [], common_parent: "downloads" },
  { id: "dup-004", file_size: 8_000_000, file_count: 7, total_wasted_bytes: 48_000_000, files: [], common_parent: "temp" },
  { id: "dup-005", file_size: 100_000, file_count: 10, total_wasted_bytes: 900_000, files: [], common_parent: "config" },
  { id: "dup-006", file_size: 500_000, file_count: 9, total_wasted_bytes: 4_000_000, files: [], common_parent: "logs" },
  { id: "dup-007", file_size: 75_000_000, file_count: 7, total_wasted_bytes: 450_000_000, files: [], common_parent: "videos" },
];

const defaultSortConfig: DuplicateSortConfig = { field: "wasted", direction: "desc" };

const defaultFilterState: DuplicateFilterState = {
  search: "",
  folder: "",
  extensions: [],
  countMin: null,
  countMax: null,
  sizeMin: null,
  sizeMax: null,
  extensionFilter: "",
  sortConfig: defaultSortConfig,
};

describe("DuplicateSummarySection", () => {
  it("renders summary stats", () => {
    render(<DuplicateSummarySection summary={mockDuplicateSummary} />);
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("58")).toBeInTheDocument();
  });

  it("displays wasted space stat", () => {
    render(<DuplicateSummarySection summary={mockDuplicateSummary} />);
    expect(screen.getByText("1.6 GB")).toBeInTheDocument();
  });

  it("shows scanned file count", () => {
    render(<DuplicateSummarySection summary={mockDuplicateSummary} />);
    expect(screen.getByText("284.7K")).toBeInTheDocument();
  });

  it("renders loading state", () => {
    const { container } = render(<DuplicateSummarySection summary={null} loading />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders null state", () => {
    render(<DuplicateSummarySection summary={null} />);
    expect(screen.getByText("No duplicate data available")).toBeInTheDocument();
  });
});

describe("SearchAndFilter", () => {
  it("renders search input", () => {
    render(
      <SearchAndFilter
        filter={defaultFilterState}
        onFilterChange={vi.fn()}
        sortConfig={defaultSortConfig}
        onSortChange={vi.fn()}
        onSortDirectionToggle={vi.fn()}
      />,
    );
    expect(screen.getByPlaceholderText("Search by folder...")).toBeInTheDocument();
  });

  it("calls onFilterChange on search", async () => {
    const onFilterChange = vi.fn();
    render(
      <SearchAndFilter
        filter={defaultFilterState}
        onFilterChange={onFilterChange}
        sortConfig={defaultSortConfig}
        onSortChange={vi.fn()}
        onSortDirectionToggle={vi.fn()}
      />,
    );
    const input = screen.getByPlaceholderText("Search by folder...");
    await userEvent.type(input, "node");
    expect(onFilterChange).toHaveBeenCalled();
  });

  it("calls onFilterChange on extension select", async () => {
    const onFilterChange = vi.fn();
    render(
      <SearchAndFilter
        filter={defaultFilterState}
        onFilterChange={onFilterChange}
        sortConfig={defaultSortConfig}
        onSortChange={vi.fn()}
        onSortDirectionToggle={vi.fn()}
      />,
    );
    const selects = screen.getAllByRole("combobox");
    await userEvent.selectOptions(selects[0], ".js");
    expect(onFilterChange).toHaveBeenCalledWith({ extensions: [".js"] });
  });

  it("calls onSortChange", async () => {
    const onSortChange = vi.fn();
    render(
      <SearchAndFilter
        filter={defaultFilterState}
        onFilterChange={vi.fn()}
        sortConfig={defaultSortConfig}
        onSortChange={onSortChange}
        onSortDirectionToggle={vi.fn()}
      />,
    );
    const selects = screen.getAllByRole("combobox");
    await userEvent.selectOptions(selects[1], "size");
    expect(onSortChange).toHaveBeenCalledWith("size");
  });

  it("calls onSortDirectionToggle", async () => {
    const onToggle = vi.fn();
    render(
      <SearchAndFilter
        filter={defaultFilterState}
        onFilterChange={vi.fn()}
        sortConfig={defaultSortConfig}
        onSortChange={vi.fn()}
        onSortDirectionToggle={onToggle}
      />,
    );
    const button = screen.getByTitle("Descending");
    await userEvent.click(button);
    expect(onToggle).toHaveBeenCalled();
  });

  it("shows clear button when search has value", () => {
    const filter = { ...defaultFilterState, folder: "node_modules" };
    render(
      <SearchAndFilter
        filter={filter}
        onFilterChange={vi.fn()}
        sortConfig={defaultSortConfig}
        onSortChange={vi.fn()}
        onSortDirectionToggle={vi.fn()}
      />,
    );
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it("renders loading state", () => {
    const { container } = render(
      <SearchAndFilter
        filter={defaultFilterState}
        onFilterChange={vi.fn()}
        sortConfig={defaultSortConfig}
        onSortChange={vi.fn()}
        onSortDirectionToggle={vi.fn()}
        loading
      />,
    );
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });
});

describe("DuplicateGroupList", () => {
  const emptySelection = new Set<string>();

  it("renders groups", () => {
    render(
      <DuplicateGroupList
        groups={mockDuplicateGroups}
        selectedGroupId={null}
        selectedFileIds={emptySelection}
        onSelectGroup={vi.fn()}
        onToggleGroup={vi.fn()}
        onToggleFile={vi.fn()}
      />,
    );
    expect(screen.getByText(/7 groups/)).toBeInTheDocument();
  });

  it("shows file count per group", () => {
    render(
      <DuplicateGroupList
        groups={mockDuplicateGroups}
        selectedGroupId={null}
        selectedFileIds={emptySelection}
        onSelectGroup={vi.fn()}
        onToggleGroup={vi.fn()}
        onToggleFile={vi.fn()}
      />,
    );
    expect(screen.getByText("12 copies")).toBeInTheDocument();
  });

  it("expands group on click", async () => {
    const onSelectGroup = vi.fn();
    render(
      <DuplicateGroupList
        groups={mockDuplicateGroups}
        selectedGroupId={null}
        selectedFileIds={emptySelection}
        onSelectGroup={onSelectGroup}
        onToggleGroup={vi.fn()}
        onToggleFile={vi.fn()}
      />,
    );
    const buttons = screen.getAllByText(/copies/);
    await userEvent.click(buttons[0].closest("button")!);
    expect(onSelectGroup).toHaveBeenCalledWith("dup-001");
  });

  it("toggles group selection", async () => {
    const onToggleGroup = vi.fn();
    render(
      <DuplicateGroupList
        groups={mockDuplicateGroups}
        selectedGroupId={null}
        selectedFileIds={emptySelection}
        onSelectGroup={vi.fn()}
        onToggleGroup={onToggleGroup}
        onToggleFile={vi.fn()}
      />,
    );
    const checkboxes = document.querySelectorAll('[role="checkbox"]');
    await userEvent.click(checkboxes[0]);
    expect(onToggleGroup).toHaveBeenCalledWith("dup-001", true);
  });

  it("renders loading state", () => {
    const { container } = render(
      <DuplicateGroupList
        groups={[]}
        selectedGroupId={null}
        selectedFileIds={emptySelection}
        onSelectGroup={vi.fn()}
        onToggleGroup={vi.fn()}
        onToggleFile={vi.fn()}
        loading
      />,
    );
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders empty state", () => {
    render(
      <DuplicateGroupList
        groups={[]}
        selectedGroupId={null}
        selectedFileIds={emptySelection}
        onSelectGroup={vi.fn()}
        onToggleGroup={vi.fn()}
        onToggleFile={vi.fn()}
      />,
    );
    expect(screen.getByText("No duplicates found")).toBeInTheDocument();
  });
});

describe("DuplicateDetailsPanel", () => {
  const group = mockDuplicateGroups[0];

  it("renders group details", () => {
    render(
      <DuplicateDetailsPanel
        group={group}
        selectedFileIds={new Set()}
        onToggleFile={vi.fn()}
        onSelectAll={vi.fn()}
      />,
    );
    expect(screen.getByText(/12 files/)).toBeInTheDocument();
  });

  it("shows file list with names", () => {
    render(
      <DuplicateDetailsPanel
        group={group}
        selectedFileIds={new Set()}
        onToggleFile={vi.fn()}
        onSelectAll={vi.fn()}
      />,
    );
    expect(screen.getAllByText("lodash.min.js").length).toBeGreaterThan(0);
  });

  it("renders loading state", () => {
    const { container } = render(
      <DuplicateDetailsPanel
        group={null}
        selectedFileIds={new Set()}
        onToggleFile={vi.fn()}
        onSelectAll={vi.fn()}
        loading
      />,
    );
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders null state", () => {
    render(
      <DuplicateDetailsPanel
        group={null}
        selectedFileIds={new Set()}
        onToggleFile={vi.fn()}
        onSelectAll={vi.fn()}
      />,
    );
    expect(screen.getByText("No group selected")).toBeInTheDocument();
  });

  it("calls onToggleFile when file checkbox clicked", async () => {
    const onToggleFile = vi.fn();
    render(
      <DuplicateDetailsPanel
        group={group}
        selectedFileIds={new Set()}
        onToggleFile={onToggleFile}
        onSelectAll={vi.fn()}
      />,
    );
    const checkboxes = document.querySelectorAll('[role="checkbox"]');
    await userEvent.click(checkboxes[0]);
    expect(onToggleFile).toHaveBeenCalled();
  });

  it("shows file size stat", () => {
    render(
      <DuplicateDetailsPanel
        group={group}
        selectedFileIds={new Set()}
        onToggleFile={vi.fn()}
        onSelectAll={vi.fn()}
      />,
    );
    expect(screen.getAllByText("41.7 MB").length).toBeGreaterThan(0);
  });

  it("shows wasted space stat", () => {
    render(
      <DuplicateDetailsPanel
        group={group}
        selectedFileIds={new Set()}
        onToggleFile={vi.fn()}
        onSelectAll={vi.fn()}
      />,
    );
    expect(screen.getByText("458.2 MB")).toBeInTheDocument();
  });

  it("shows file paths", () => {
    render(
      <DuplicateDetailsPanel
        group={group}
        selectedFileIds={new Set()}
        onToggleFile={vi.fn()}
        onSelectAll={vi.fn()}
      />,
    );
    expect(screen.getAllByText(/lodash\\/).length).toBeGreaterThan(0);
  });
});

describe("DuplicateActions", () => {
  it("renders action buttons", () => {
    render(<DuplicateActions selectedCount={3} selectedSavings={91_600_000} />);
    expect(screen.getByText("Preview Move")).toBeInTheDocument();
    expect(screen.getByText("Preview Delete")).toBeInTheDocument();
    expect(screen.getByText("Smart Move")).toBeInTheDocument();
    expect(screen.getByText("Export Report")).toBeInTheDocument();
  });

  it("buttons disabled when no selection", () => {
    render(<DuplicateActions selectedCount={0} selectedSavings={0} />);
    expect(screen.getByText("Preview Move").closest("button")).toBeDisabled();
    expect(screen.getByText("Smart Move").closest("button")).toBeDisabled();
  });

  it("shows selected count and savings", () => {
    render(<DuplicateActions selectedCount={3} selectedSavings={91_600_000} />);
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText(/91.6 MB/)).toBeInTheDocument();
  });

  it("calls onPreviewMove", async () => {
    const onPreviewMove = vi.fn();
    render(
      <DuplicateActions selectedCount={2} selectedSavings={45_800_000} onPreviewMove={onPreviewMove} />,
    );
    await userEvent.click(screen.getByText("Preview Move"));
    expect(onPreviewMove).toHaveBeenCalled();
  });

  it("calls onPreviewDelete", async () => {
    const onPreviewDelete = vi.fn();
    render(
      <DuplicateActions selectedCount={2} selectedSavings={45_800_000} onPreviewDelete={onPreviewDelete} />,
    );
    await userEvent.click(screen.getByText("Preview Delete"));
    expect(onPreviewDelete).toHaveBeenCalled();
  });

  it("calls onSmartMove", async () => {
    const onSmartMove = vi.fn();
    render(
      <DuplicateActions selectedCount={2} selectedSavings={45_800_000} onSmartMove={onSmartMove} />,
    );
    await userEvent.click(screen.getByText("Smart Move"));
    expect(onSmartMove).toHaveBeenCalled();
  });

  it("calls onExportReport", async () => {
    const onExportReport = vi.fn();
    render(
      <DuplicateActions selectedCount={2} selectedSavings={45_800_000} onExportReport={onExportReport} />,
    );
    await userEvent.click(screen.getByText("Export Report"));
    expect(onExportReport).toHaveBeenCalled();
  });

  it("renders loading state", () => {
    const { container } = render(<DuplicateActions selectedCount={0} selectedSavings={0} loading />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("shows hint when no selection", () => {
    render(<DuplicateActions selectedCount={0} selectedSavings={0} />);
    expect(screen.getByText("Select files to take action")).toBeInTheDocument();
  });
});
