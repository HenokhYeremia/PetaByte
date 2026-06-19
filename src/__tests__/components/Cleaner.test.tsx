import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { CacheSummarySection } from "@/components/cleaner/CacheSummarySection";
import { CacheCategoryPanel } from "@/components/cleaner/CacheCategoryPanel";
import { CacheSearchFilter } from "@/components/cleaner/CacheSearchFilter";
import { CacheDetailsTable } from "@/components/cleaner/CacheDetailsTable";
import { CacheCleanupPreview } from "@/components/cleaner/CacheCleanupPreview";
import { CacheActions } from "@/components/cleaner/CacheActions";
import {
  mockCategories,
  defaultCacheFilter,
} from "@/mocks/cache";
import type { MockCacheStatus } from "@/mocks/cache";

describe("CacheSummarySection", () => {
  const props = {
    totalCacheSize: 2_100_000_000,
    potentialSavings: 1_470_000_000,
    categoryCount: 5,
    lastAnalysis: "2026-06-15T10:30:00.000Z",
  };

  it("renders total cache size", () => {
    render(<CacheSummarySection {...props} />);
    expect(screen.getByText("2.0 GB")).toBeInTheDocument();
  });

  it("renders potential savings", () => {
    render(<CacheSummarySection {...props} />);
    expect(screen.getByText("1.4 GB")).toBeInTheDocument();
  });

  it("renders category count", () => {
    render(<CacheSummarySection {...props} />);
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("renders last analysis date", () => {
    render(<CacheSummarySection {...props} />);
    expect(screen.getByText(/15 Jun/)).toBeInTheDocument();
  });

  it("shows Never when no last analysis", () => {
    render(<CacheSummarySection {...props} lastAnalysis={null} />);
    expect(screen.getByText("Never")).toBeInTheDocument();
  });

  it("renders loading state", () => {
    const { container } = render(
      <CacheSummarySection totalCacheSize={0} potentialSavings={0} categoryCount={0} lastAnalysis={null} loading />,
    );
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });
});

describe("CacheCategoryPanel", () => {
  const props = {
    categories: mockCategories,
    selectedCategoryId: null,
    onSelectCategory: vi.fn(),
  };

  it("renders all category names", () => {
    render(<CacheCategoryPanel {...props} />);
    expect(screen.getByText("Browser Cache")).toBeInTheDocument();
    expect(screen.getByText("Developer Cache")).toBeInTheDocument();
    expect(screen.getByText("Temporary Files")).toBeInTheDocument();
    expect(screen.getByText("Package Manager Cache")).toBeInTheDocument();
    expect(screen.getByText("Application Cache")).toBeInTheDocument();
  });

  it("renders risk badges", () => {
    render(<CacheCategoryPanel {...props} />);
    const safeBadges = screen.getAllByText("safe");
    expect(safeBadges.length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByText("moderate").length).toBeGreaterThanOrEqual(1);
  });

  it("calls onSelectCategory on click", async () => {
    const onSelect = vi.fn();
    render(<CacheCategoryPanel {...props} onSelectCategory={onSelect} />);
    await userEvent.click(screen.getByText("Browser Cache"));
    expect(onSelect).toHaveBeenCalledWith("browser");
  });

  it("toggles selection on re-click", async () => {
    const onSelect = vi.fn();
    render(<CacheCategoryPanel {...props} onSelectCategory={onSelect} selectedCategoryId="browser" />);
    await userEvent.click(screen.getByText("Browser Cache"));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it("renders loading state", () => {
    const { container } = render(
      <CacheCategoryPanel categories={[]} selectedCategoryId={null} onSelectCategory={vi.fn()} loading />,
    );
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders empty state when no categories", () => {
    render(
      <CacheCategoryPanel categories={[]} selectedCategoryId={null} onSelectCategory={vi.fn()} />,
    );
    expect(screen.getByText("No cache categories found")).toBeInTheDocument();
  });
});

describe("CacheSearchFilter", () => {
  const props = {
    filter: defaultCacheFilter,
    categories: mockCategories.map((c) => ({ id: c.id, display_name: c.display_name })),
    onFilterChange: vi.fn(),
  };

  it("renders search input", () => {
    render(<CacheSearchFilter {...props} />);
    expect(screen.getByPlaceholderText("Search cache files...")).toBeInTheDocument();
  });

  it("renders category select", () => {
    render(<CacheSearchFilter {...props} />);
    expect(screen.getByText("All Categories")).toBeInTheDocument();
    expect(screen.getByText("Browser Cache")).toBeInTheDocument();
  });

  it("renders safety select", () => {
    render(<CacheSearchFilter {...props} />);
    expect(screen.getByText("All Safety")).toBeInTheDocument();
  });

  it("calls onFilterChange on search", async () => {
    const onChange = vi.fn();
    render(<CacheSearchFilter {...props} onFilterChange={onChange} />);
    const input = screen.getByPlaceholderText("Search cache files...");
    await userEvent.type(input, "node");
    expect(onChange).toHaveBeenCalled();
  });

  it("calls onFilterChange on category select", async () => {
    const onChange = vi.fn();
    render(<CacheSearchFilter {...props} onFilterChange={onChange} />);
    const selects = screen.getAllByRole("combobox");
    await userEvent.selectOptions(selects[0], "developer");
    expect(onChange).toHaveBeenCalledWith({ categoryFilter: "developer" });
  });

  it("calls onFilterChange on safety select", async () => {
    const onChange = vi.fn();
    render(<CacheSearchFilter {...props} onFilterChange={onChange} />);
    const selects = screen.getAllByRole("combobox");
    await userEvent.selectOptions(selects[1], "warning");
    expect(onChange).toHaveBeenCalledWith({ safetyFilter: "warning" });
  });
});

describe("CacheDetailsTable", () => {
  const props = {
    categories: mockCategories,
    filter: defaultCacheFilter,
    onSelectEntry: vi.fn(),
    onSelectAll: vi.fn(),
  };

  it("renders table headers", () => {
    render(<CacheDetailsTable {...props} />);
    expect(screen.getByText("Path")).toBeInTheDocument();
    expect(screen.getByText("Category")).toBeInTheDocument();
    expect(screen.getByText("Size")).toBeInTheDocument();
    expect(screen.getByText("Safety")).toBeInTheDocument();
    expect(screen.getByText("Rule")).toBeInTheDocument();
  });

  it("renders entry names", () => {
    render(<CacheDetailsTable {...props} />);
    expect(screen.getByText("cache_001.bin")).toBeInTheDocument();
    expect(screen.getByText("node_modules")).toBeInTheDocument();
  });

  it("renders category badges", () => {
    render(<CacheDetailsTable {...props} />);
    expect(screen.getAllByText("Browser Cache").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Developer Cache").length).toBeGreaterThanOrEqual(1);
  });

  it("renders safety status indicators", () => {
    render(<CacheDetailsTable {...props} />);
    const safeLabels = screen.getAllByText("safe");
    expect(safeLabels.length).toBeGreaterThan(0);
  });

  it("calls onSelectAll on header checkbox click", async () => {
    const onSelectAll = vi.fn();
    render(<CacheDetailsTable {...props} onSelectAll={onSelectAll} />);
    const headerBtn = screen.getAllByRole("button")[0];
    await userEvent.click(headerBtn);
    expect(onSelectAll).toHaveBeenCalledWith(true);
  });

  it("calls onSelectEntry on row checkbox click", async () => {
    const onSelectEntry = vi.fn();
    render(<CacheDetailsTable {...props} onSelectEntry={onSelectEntry} />);
    const checkboxes = screen.getAllByRole("button").filter((b) => b.querySelector("svg"));
    const rowCheckbox = checkboxes[1];
    await userEvent.click(rowCheckbox);
    expect(onSelectEntry).toHaveBeenCalledWith(expect.any(String), true);
  });

  it("renders loading state", () => {
    const { container } = render(
      <CacheDetailsTable categories={[]} filter={defaultCacheFilter} onSelectEntry={vi.fn()} onSelectAll={vi.fn()} loading />,
    );
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders empty state when no entries", () => {
    render(
      <CacheDetailsTable categories={[]} filter={defaultCacheFilter} onSelectEntry={vi.fn()} onSelectAll={vi.fn()} />,
    );
    expect(screen.getByText("No cache entries")).toBeInTheDocument();
  });
});

describe("CacheCleanupPreview", () => {
  const selectedPreview = {
    files_to_remove: 8,
    estimated_savings: 450_000_000,
    risk_level: "medium" as const,
    items: [
      { path: "C:\\cache\\file1.bin", size: 12000000, category: "Browser Cache", safe: true },
      { path: "C:\\cache\\file2.bin", size: 45000000, category: "Browser Cache", safe: true },
      { path: "D:\\Projects\\node_modules", size: 520000000, category: "Developer Cache", safe: true },
    ],
  };

  it("renders files to remove count", () => {
    render(<CacheCleanupPreview preview={selectedPreview} />);
    expect(screen.getByText("8")).toBeInTheDocument();
  });

  it("renders estimated savings", () => {
    render(<CacheCleanupPreview preview={selectedPreview} />);
    expect(screen.getByText("429.2 MB")).toBeInTheDocument();
  });

  it("renders risk level badge", () => {
    render(<CacheCleanupPreview preview={selectedPreview} />);
    expect(screen.getByText("Medium Risk")).toBeInTheDocument();
  });

  it("renders loading state", () => {
    const { container } = render(<CacheCleanupPreview preview={null} loading />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders empty state when no preview", () => {
    render(<CacheCleanupPreview preview={null} />);
    expect(screen.getByText("No items selected for cleanup")).toBeInTheDocument();
  });
});

describe("CacheActions", () => {
  const defaultProps = {
    status: "idle" as MockCacheStatus,
    hasSelection: false,
    onAnalyze: vi.fn(),
    onPreview: vi.fn(),
    onClean: vi.fn(),
    onCancel: vi.fn(),
  };

  it("renders Analyze button in idle state", () => {
    render(<CacheActions {...defaultProps} />);
    expect(screen.getByText("Analyze")).toBeInTheDocument();
  });

  it("calls onAnalyze on click", async () => {
    const onAnalyze = vi.fn();
    render(<CacheActions {...defaultProps} onAnalyze={onAnalyze} />);
    await userEvent.click(screen.getByText("Analyze"));
    expect(onAnalyze).toHaveBeenCalledOnce();
  });

  it("shows Analyzing... when analyzing", () => {
    render(<CacheActions {...defaultProps} status="analyzing" />);
    expect(screen.getByText("Analyzing...")).toBeInTheDocument();
  });

  it("shows Preview Cleanup and Start Cleanup in previewing state", () => {
    render(<CacheActions {...defaultProps} status="previewing" hasSelection />);
    expect(screen.getByText("Preview Cleanup")).toBeInTheDocument();
    expect(screen.getByText("Start Cleanup")).toBeInTheDocument();
  });

  it("disables action buttons when no selection", () => {
    render(<CacheActions {...defaultProps} status="previewing" hasSelection={false} />);
    expect(screen.getByText("Preview Cleanup").closest("button")).toBeDisabled();
    expect(screen.getByText("Start Cleanup").closest("button")).toBeDisabled();
  });

  it("shows Cancel in cleaning state", () => {
    render(<CacheActions {...defaultProps} status="cleaning" />);
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("renders loading state", () => {
    const { container } = render(<CacheActions {...defaultProps} loading />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("shows Analyze again after completed", () => {
    render(<CacheActions {...defaultProps} status="completed" />);
    expect(screen.getByText("Analyze")).toBeInTheDocument();
  });

  it("shows Analyze again after cancelled", () => {
    render(<CacheActions {...defaultProps} status="cancelled" />);
    expect(screen.getByText("Analyze")).toBeInTheDocument();
  });
});
