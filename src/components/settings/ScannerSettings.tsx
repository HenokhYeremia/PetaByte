import { ScanLine } from "lucide-react";
import { SettingsSectionCard, SettingsSelect, SettingsTextInput, SettingsNumberInput, SettingsToggle, SettingsTextListInput } from "./SettingsPrimitives";
import type { MockScannerSettings } from "@/mocks/settings";

interface ScannerSettingsProps {
  settings: MockScannerSettings;
  onChange: (partial: Partial<MockScannerSettings>) => void;
  loading?: boolean;
  error?: string | null;
}

export function ScannerSettings({ settings, onChange, loading, error }: ScannerSettingsProps) {
  return (
    <SettingsSectionCard
      title="Scanner"
      description="Default scan location, ignore rules, and performance options"
      icon={<ScanLine className="h-5 w-5" />}
      loading={loading}
      error={error}
    >
      <SettingsTextInput
        label="Default Scan Location"
        description="Directory scanned by default when starting a new scan"
        value={settings.default_scan_location}
        placeholder="C:\Users\..."
        onChange={(v) => onChange({ default_scan_location: v })}
      />
      <SettingsTextListInput
        label="Ignore Rules"
        description="Glob patterns for files and directories to skip"
        values={settings.ignore_rules}
        placeholder="**/pattern/**"
        onChange={(v) => onChange({ ignore_rules: v })}
      />
      <SettingsSelect
        label="Max Depth"
        description="Maximum directory nesting depth (unlimited = no limit)"
        value={settings.max_depth?.toString() ?? "unlimited"}
        options={[
          { value: "unlimited", label: "Unlimited" },
          { value: "1", label: "1 level" },
          { value: "3", label: "3 levels" },
          { value: "5", label: "5 levels" },
          { value: "10", label: "10 levels" },
          { value: "20", label: "20 levels" },
          { value: "50", label: "50 levels" },
        ]}
        onChange={(v) => onChange({ max_depth: v === "unlimited" ? null : Number(v) })}
      />
      <SettingsToggle
        label="Follow Symlinks"
        description="Follow symbolic links during scan (may escape scan root)"
        checked={settings.follow_symlinks}
        onChange={(v) => onChange({ follow_symlinks: v })}
      />
      <SettingsNumberInput
        label="Thread Count"
        description="Parallel worker threads for scanning"
        value={settings.thread_count}
        min={1}
        max={32}
        onChange={(v) => onChange({ thread_count: v ?? 4 })}
      />
      <SettingsNumberInput
        label="Min File Size"
        description="Skip files smaller than this (bytes)"
        value={settings.min_file_size}
        placeholder="No limit"
        min={0}
        step={1024}
        onChange={(v) => onChange({ min_file_size: v })}
      />
      <SettingsNumberInput
        label="Max File Size"
        description="Skip files larger than this (bytes)"
        value={settings.max_file_size}
        placeholder="No limit"
        min={0}
        step={1024}
        onChange={(v) => onChange({ max_file_size: v })}
      />
    </SettingsSectionCard>
  );
}
