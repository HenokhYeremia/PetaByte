import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { GeneralSettings } from "@/components/settings/GeneralSettings";
import { ScannerSettings } from "@/components/settings/ScannerSettings";
import { DuplicateSettings } from "@/components/settings/DuplicateSettings";
import { MoveSettings } from "@/components/settings/MoveSettings";
import { CacheCleanerSettings } from "@/components/settings/CacheCleanerSettings";
import { HealthScoreSettings } from "@/components/settings/HealthScoreSettings";
import { AppSettings } from "@/components/settings/AppSettings";
import { SettingsSectionCard, SettingsToggle, SettingsSelect, SettingsTextInput, SettingsNumberInput, SettingsTextListInput } from "@/components/settings/SettingsPrimitives";
import {
  defaultGeneralSettings,
  defaultScannerSettings,
  defaultDuplicateSettings,
  defaultMoveSettings,
  defaultCacheCleanerSettings,
  defaultHealthScoreSettings,
  defaultAppSettings,
} from "@/mocks/settings";

describe("SettingsPrimitives", () => {
  describe("SettingsToggle", () => {
    it("renders label and description", () => {
      render(<SettingsToggle label="Test" description="Desc" checked={false} onChange={vi.fn()} />);
      expect(screen.getByText("Test")).toBeInTheDocument();
      expect(screen.getByText("Desc")).toBeInTheDocument();
    });

    it("fires onChange when clicked", async () => {
      const onChange = vi.fn();
      render(<SettingsToggle label="Test" checked={false} onChange={onChange} />);
      await userEvent.click(screen.getByRole("checkbox"));
      expect(onChange).toHaveBeenCalledWith(true);
    });

    it("renders without description", () => {
      render(<SettingsToggle label="Test" checked={false} onChange={vi.fn()} />);
      expect(screen.getByText("Test")).toBeInTheDocument();
    });
  });

  describe("SettingsSelect", () => {
    it("renders label and options", () => {
      render(
        <SettingsSelect
          label="Theme"
          value="dark"
          options={[{ value: "dark", label: "Dark" }, { value: "light", label: "Light" }]}
          onChange={vi.fn()}
        />,
      );
      expect(screen.getByText("Theme")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Dark")).toBeInTheDocument();
    });

    it("fires onChange on selection", async () => {
      const onChange = vi.fn();
      render(
        <SettingsSelect
          label="Theme"
          value="dark"
          options={[{ value: "dark", label: "Dark" }, { value: "light", label: "Light" }]}
          onChange={onChange}
        />,
      );
      await userEvent.selectOptions(screen.getByRole("combobox"), "light");
      expect(onChange).toHaveBeenCalledWith("light");
    });
  });

  describe("SettingsTextInput", () => {
    it("renders and fires onChange", async () => {
      const onChange = vi.fn();
      render(<SettingsTextInput label="Path" value="" onChange={onChange} />);
      await userEvent.type(screen.getByRole("textbox"), "C:\\test");
      expect(onChange).toHaveBeenCalled();
    });

    it("shows error state", () => {
      render(<SettingsTextInput label="Path" value="" onChange={vi.fn()} error="Invalid path" />);
      expect(screen.getByText("Invalid path")).toBeInTheDocument();
    });
  });

  describe("SettingsNumberInput", () => {
    it("renders and fires onChange", async () => {
      const onChange = vi.fn();
      render(<SettingsNumberInput label="Count" value={null} onChange={onChange} />);
      const input = screen.getByRole("spinbutton");
      await userEvent.type(input, "5");
      expect(onChange).toHaveBeenCalled();
    });
  });

  describe("SettingsTextListInput", () => {
    it("renders list of values", () => {
      render(<SettingsTextListInput label="Rules" values={["rule1", "rule2"]} onChange={vi.fn()} />);
      expect(screen.getByDisplayValue("rule1")).toBeInTheDocument();
      expect(screen.getByDisplayValue("rule2")).toBeInTheDocument();
    });

    it("fires onChange when adding a rule", async () => {
      const onChange = vi.fn();
      render(<SettingsTextListInput label="Rules" values={["rule1"]} onChange={onChange} />);
      await userEvent.click(screen.getByText("+ Add Rule"));
      expect(onChange).toHaveBeenCalledWith(["rule1", ""]);
    });

    it("fires onChange when removing a rule", async () => {
      const onChange = vi.fn();
      render(<SettingsTextListInput label="Rules" values={["rule1", "rule2"]} onChange={onChange} />);
      const removeButtons = screen.getAllByText("✕");
      await userEvent.click(removeButtons[0]);
      expect(onChange).toHaveBeenCalledWith(["rule2"]);
    });
  });

  describe("SettingsSectionCard", () => {
    it("renders title and children", () => {
      render(
        <SettingsSectionCard title="Section">
          <p>Content</p>
        </SettingsSectionCard>,
      );
      expect(screen.getByText("Section")).toBeInTheDocument();
      expect(screen.getByText("Content")).toBeInTheDocument();
    });

    it("renders loading state", () => {
      const { container } = render(
        <SettingsSectionCard title="Section" loading>
          <p>Content</p>
        </SettingsSectionCard>,
      );
      expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
      expect(screen.queryByText("Content")).not.toBeInTheDocument();
    });

    it("renders error state", () => {
      render(
        <SettingsSectionCard title="Section" error="Something broke">
          <p>Content</p>
        </SettingsSectionCard>,
      );
      expect(screen.getByText("Something broke")).toBeInTheDocument();
      expect(screen.queryByText("Content")).not.toBeInTheDocument();
    });

    it("renders description", () => {
      render(
        <SettingsSectionCard title="Section" description="A section">
          <p>Content</p>
        </SettingsSectionCard>,
      );
      expect(screen.getByText("A section")).toBeInTheDocument();
    });
  });
});

describe("GeneralSettings", () => {
  it("renders all fields", () => {
    render(<GeneralSettings settings={defaultGeneralSettings} onChange={vi.fn()} />);
    expect(screen.getByText("General")).toBeInTheDocument();
    expect(screen.getByText("Language")).toBeInTheDocument();
    expect(screen.getByText("Theme")).toBeInTheDocument();
    expect(screen.getByText("Startup Behavior")).toBeInTheDocument();
  });

  it("fires onChange on language select", async () => {
    const onChange = vi.fn();
    render(<GeneralSettings settings={defaultGeneralSettings} onChange={onChange} />);
    await userEvent.selectOptions(screen.getAllByRole("combobox")[0], "ja");
    expect(onChange).toHaveBeenCalledWith({ language: "ja" });
  });

  it("renders loading state", () => {
    const { container } = render(<GeneralSettings settings={defaultGeneralSettings} onChange={vi.fn()} loading />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders error state", () => {
    render(<GeneralSettings settings={defaultGeneralSettings} onChange={vi.fn()} error="Failed to load" />);
    expect(screen.getByText("Failed to load")).toBeInTheDocument();
  });
});

describe("ScannerSettings", () => {
  it("renders all fields", () => {
    render(<ScannerSettings settings={defaultScannerSettings} onChange={vi.fn()} />);
    expect(screen.getByText("Scanner")).toBeInTheDocument();
    expect(screen.getByText("Default Scan Location")).toBeInTheDocument();
    expect(screen.getByText("Ignore Rules")).toBeInTheDocument();
    expect(screen.getByText("Max Depth")).toBeInTheDocument();
  });

  it("fires onChange on toggle", async () => {
    const onChange = vi.fn();
    render(<ScannerSettings settings={defaultScannerSettings} onChange={onChange} />);
    const checkboxes = screen.getAllByRole("checkbox");
    await userEvent.click(checkboxes[0]);
    expect(onChange).toHaveBeenCalledWith({ follow_symlinks: true });
  });

  it("renders loading state", () => {
    const { container } = render(<ScannerSettings settings={defaultScannerSettings} onChange={vi.fn()} loading />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });
});

describe("DuplicateSettings", () => {
  it("renders all fields", () => {
    render(<DuplicateSettings settings={defaultDuplicateSettings} onChange={vi.fn()} />);
    expect(screen.getByText("Duplicate Detection")).toBeInTheDocument();
    expect(screen.getByText("Hash Strategy")).toBeInTheDocument();
    expect(screen.getByText("Minimum Group Size")).toBeInTheDocument();
    expect(screen.getByText("Verify on Move")).toBeInTheDocument();
    expect(screen.getByText("Verify on Delete")).toBeInTheDocument();
  });

  it("fires onChange on strategy select", async () => {
    const onChange = vi.fn();
    render(<DuplicateSettings settings={defaultDuplicateSettings} onChange={onChange} />);
    await userEvent.selectOptions(screen.getByRole("combobox"), "full");
    expect(onChange).toHaveBeenCalledWith({ hash_strategy: "full" });
  });

  it("renders loading state", () => {
    const { container } = render(<DuplicateSettings settings={defaultDuplicateSettings} onChange={vi.fn()} loading />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });
});

describe("MoveSettings", () => {
  it("renders all fields", () => {
    render(<MoveSettings settings={defaultMoveSettings} onChange={vi.fn()} />);
    expect(screen.getByText("Smart Move")).toBeInTheDocument();
    expect(screen.getByText("Default Destination")).toBeInTheDocument();
    expect(screen.getByText("Conflict Resolution")).toBeInTheDocument();
    expect(screen.getByText("Undo Retention")).toBeInTheDocument();
  });

  it("fires onChange on conflict strategy", async () => {
    const onChange = vi.fn();
    render(<MoveSettings settings={defaultMoveSettings} onChange={onChange} />);
    await userEvent.selectOptions(screen.getByRole("combobox"), "skip");
    expect(onChange).toHaveBeenCalledWith({ conflict_strategy: "skip" });
  });

  it("renders loading state", () => {
    const { container } = render(<MoveSettings settings={defaultMoveSettings} onChange={vi.fn()} loading />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });
});

describe("CacheCleanerSettings", () => {
  it("renders all fields", () => {
    render(<CacheCleanerSettings settings={defaultCacheCleanerSettings} onChange={vi.fn()} />);
    expect(screen.getByText("Cache Cleaner")).toBeInTheDocument();
    expect(screen.getByText("Enabled Categories")).toBeInTheDocument();
    expect(screen.getByText("Minimum Safety Level")).toBeInTheDocument();
    expect(screen.getByText("Dry Run by Default")).toBeInTheDocument();
  });

  it("toggles a category on click", async () => {
    const onChange = vi.fn();
    render(<CacheCleanerSettings settings={defaultCacheCleanerSettings} onChange={onChange} />);
    const browserBtn = screen.getByRole("button", { name: /Browser Cache/ });
    await userEvent.click(browserBtn);
    expect(onChange).toHaveBeenCalledWith({
      enabled_categories: ["developer", "temporary", "package_manager"],
    });
  });

  it("renders loading state", () => {
    const { container } = render(<CacheCleanerSettings settings={defaultCacheCleanerSettings} onChange={vi.fn()} loading />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });
});

describe("HealthScoreSettings", () => {
  it("renders all fields", () => {
    render(<HealthScoreSettings settings={defaultHealthScoreSettings} onChange={vi.fn()} />);
    expect(screen.getByText("Health Score")).toBeInTheDocument();
    expect(screen.getByText("Scoring Sensitivity")).toBeInTheDocument();
    expect(screen.getByText("Show Anomalies")).toBeInTheDocument();
    expect(screen.getByText("Auto-Analyze")).toBeInTheDocument();
    expect(screen.getByText("Recommendation Count")).toBeInTheDocument();
  });

  it("fires onChange on sensitivity select", async () => {
    const onChange = vi.fn();
    render(<HealthScoreSettings settings={defaultHealthScoreSettings} onChange={onChange} />);
    await userEvent.selectOptions(screen.getByRole("combobox"), "high");
    expect(onChange).toHaveBeenCalledWith({ scoring_sensitivity: "high" });
  });

  it("renders loading state", () => {
    const { container } = render(<HealthScoreSettings settings={defaultHealthScoreSettings} onChange={vi.fn()} loading />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });
});

describe("AppSettings", () => {
  it("renders all fields", () => {
    render(<AppSettings settings={defaultAppSettings} onChange={vi.fn()} />);
    expect(screen.getByText("Application")).toBeInTheDocument();
    expect(screen.getByText("Log Level")).toBeInTheDocument();
    expect(screen.getByText("Log Retention")).toBeInTheDocument();
    expect(screen.getByText("Enable Diagnostics")).toBeInTheDocument();
    expect(screen.getByText("Auto Export")).toBeInTheDocument();
    expect(screen.getByText("Settings File Path")).toBeInTheDocument();
  });

  it("renders export/import buttons", () => {
    render(<AppSettings settings={defaultAppSettings} onChange={vi.fn()} />);
    expect(screen.getByText("Export Settings")).toBeInTheDocument();
    expect(screen.getByText("Import Settings")).toBeInTheDocument();
  });

  it("calls onExport when clicked", async () => {
    const onExport = vi.fn();
    render(<AppSettings settings={defaultAppSettings} onChange={vi.fn()} onExport={onExport} />);
    await userEvent.click(screen.getByText("Export Settings"));
    expect(onExport).toHaveBeenCalled();
  });

  it("calls onImport when clicked", async () => {
    const onImport = vi.fn();
    render(<AppSettings settings={defaultAppSettings} onChange={vi.fn()} onImport={onImport} />);
    await userEvent.click(screen.getByText("Import Settings"));
    expect(onImport).toHaveBeenCalled();
  });

  it("renders loading state", () => {
    const { container } = render(<AppSettings settings={defaultAppSettings} onChange={vi.fn()} loading />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });
});
