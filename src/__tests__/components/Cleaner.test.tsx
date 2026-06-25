import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { CacheSummarySection } from "@/components/cleaner/CacheSummarySection";
import { CacheCategoryPanel } from "@/components/cleaner/CacheCategoryPanel";
import { CacheSearchFilter } from "@/components/cleaner/CacheSearchFilter";
import { CacheDetailsTable } from "@/components/cleaner/CacheDetailsTable";
import { CacheCleanupPreview } from "@/components/cleaner/CacheCleanupPreview";
import { CacheActions } from "@/components/cleaner/CacheActions";
import type { CacheCategory, CacheFilter, CacheStatus } from "@/types";

const mockCategories: CacheCategory[] = [
  {
    id: "browser",
    name: "browser",
    display_name: "Browser Cache",
    icon: "Globe",
    risk_level: "safe",
    total_size: 500_000_000,
    file_count: 12,
    entries: [
      { id: "b1", path: "C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Cache\\cache_001.bin", name: "cache_001.bin", size: 45_000_000, matched_rule: "chrome-cache", category_id: "browser", safety_status: "safe", selected: false },
      { id: "b2", path: "C:\\Users\\Lenovo\\AppData\\Local\\Google\\Chrome\\Cache\\cache_002.bin", name: "cache_002.bin", size: 32_000_000, matched_rule: "chrome-cache", category_id: "browser", safety_status: "safe", selected: false },
    ],
  },
  {
    id: "developer",
    name: "developer",
    display_name: "Developer Cache",
    icon: "Code2",
    risk_level: "safe",
    total_size: 1_200_000_000,
    file_count: 8,
    entries: [
      { id: "d1", path: "D:\\Projects\\app\\node_modules", name: "node_modules", size: 520_000_000, matched_rule: "node-modules", category_id: "developer", safety_status: "safe", selected: false },
      { id: "d2", path: "D:\\Projects\\app\\.next\\cache", name: "next-cache", size: 180_000_000, matched_rule: "next-cache", category_id: "developer", safety_status: "safe", selected: false },
    ],
  },
  {
    id: "temporary",
    name: "temporary",
    display_name: "Temporary Files",
    icon: "FileClock",
    risk_level: "safe",
    total_size: 300_000_000,
    file_count: 15,
    entries: [],
  },
  {
    id: "package_manager",
    name: "package_manager",
    display_name: "Package Manager Cache",
    icon: "Package",
    risk_level: "moderate",
    total_size: 80_000_000,
    file_count: 5,
    entries: [],
  },
  {
    id: "application",
    name: "application",
    display_name: "Application Cache",
    icon: "AppWindow",
    risk_level: "safe",
    total_size: 20_000_000,
    file_count: 3,
    entries: [],
  },
];

const defaultCacheFilter: CacheFilter = {
  search: "",
  categoryFilter: "all",
  safetyFilter: "all",
};

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
    status: "idle" as CacheStatus,
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
