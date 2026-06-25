import { Settings } from "lucide-react";
import { SettingsSectionCard, SettingsSelect, SettingsNumberInput, SettingsToggle, SettingsTextInput } from "./SettingsPrimitives";
import type { AppSettings } from "@/types";

interface AppSettingsProps {
  settings: AppSettings;
  onChange: (partial: Partial<AppSettings>) => void;
  onExport?: () => void;
  onImport?: () => void;
  loading?: boolean;
  error?: string | null;
}

export function AppSettings({ settings, onChange, onExport, onImport, loading, error }: AppSettingsProps) {
  return (
    <SettingsSectionCard
      title="Application"
      description="Logging, diagnostics, and settings management"
      icon={<Settings className="h-5 w-5" />}
      loading={loading}
      error={error}
    >
      <SettingsSelect
        label="Log Level"
        description="Verbosity of application logs"
        value={settings.log_level}
        options={[
          { value: "debug", label: "Debug" },
          { value: "info", label: "Info" },
          { value: "warn", label: "Warning" },
          { value: "error", label: "Error" },
        ]}
        onChange={(v) => onChange({ log_level: v as AppSettings["log_level"] })}
      />
      <SettingsNumberInput
        label="Log Retention"
        description="Days to keep log files"
        value={settings.log_retention_days}
        min={1}
        max={365}
        onChange={(v) => onChange({ log_retention_days: v ?? 30 })}
      />
      <SettingsToggle
        label="Enable Diagnostics"
        description="Collect and store diagnostic information"
        checked={settings.enable_diagnostics}
        onChange={(v) => onChange({ enable_diagnostics: v })}
      />
      <SettingsToggle
        label="Auto Export"
        description="Automatically export settings on save"
        checked={settings.auto_export}
        onChange={(v) => onChange({ auto_export: v })}
      />
      <SettingsTextInput
        label="Settings File Path"
        description="Location of the settings JSON file"
        value={settings.settings_file_path}
        placeholder="C:\Users\.petabyte\settings.json"
        onChange={(v) => onChange({ settings_file_path: v })}
      />
      <div className="flex gap-3 px-3 py-3">
        <button
          type="button"
          onClick={onExport}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Export Settings
        </button>
        <button
          type="button"
          onClick={onImport}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Import Settings
        </button>
      </div>
    </SettingsSectionCard>
  );
}
