import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { DuplicateSummarySection } from "@/components/duplicates/DuplicateSummarySection";
import { SearchAndFilter } from "@/components/duplicates/SearchAndFilter";
import { DuplicateGroupList } from "@/components/duplicates/DuplicateGroupList";
import { DuplicateDetailsPanel } from "@/components/duplicates/DuplicateDetailsPanel";
import { DuplicateActions } from "@/components/duplicates/DuplicateActions";
import {
  mockDuplicateGroups,
  mockDuplicateSummary,
  defaultFilterState,
  defaultSortConfig,
} from "@/mocks/duplicates";

describe("DuplicateSummarySection", () => {
  it("renders summary stats", () => {
    render(<DuplicateSummarySection summary={mockDuplicateSummary} />);
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("58")).toBeInTheDocument();
  });

  it("displays wasted space stat", () => {
    render(<DuplicateSummarySection summary={mockDuplicateSummary} />);
    expect(screen.getByText("1.7 GB")).toBeInTheDocument();
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
    await userEvent.selectOptions(selects[1], "file_size");
    expect(onSortChange).toHaveBeenCalledWith("file_size");
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
    expect(screen.getAllByText("43.7 MB").length).toBeGreaterThan(0);
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
    expect(screen.getByText("480.5 MB")).toBeInTheDocument();
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
