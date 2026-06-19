import { Trash2 } from "lucide-react";
import { SettingsSectionCard, SettingsSelect, SettingsToggle, SettingsTextInput } from "./SettingsPrimitives";
import type { MockCacheCleanerSettings } from "@/mocks/settings";

interface CacheCleanerSettingsProps {
  settings: MockCacheCleanerSettings;
  onChange: (partial: Partial<MockCacheCleanerSettings>) => void;
  loading?: boolean;
  error?: string | null;
}

const categoryOptions = [
  { value: "browser", label: "Browser Cache" },
  { value: "developer", label: "Developer Cache" },
  { value: "temporary", label: "Temporary Files" },
  { value: "package_manager", label: "Package Manager Cache" },
  { value: "application", label: "Application Cache" },
];

export function CacheCleanerSettings({ settings, onChange, loading, error }: CacheCleanerSettingsProps) {
  const toggleCategory = (id: string) => {
    const next = settings.enabled_categories.includes(id)
      ? settings.enabled_categories.filter((c) => c !== id)
      : [...settings.enabled_categories, id];
    onChange({ enabled_categories: next });
  };

  return (
    <SettingsSectionCard
      title="Cache Cleaner"
      description="Cache categories, safety levels, and cleanup rules"
      icon={<Trash2 className="h-5 w-5" />}
      loading={loading}
      error={error}
    >
      <div className="px-3 py-2.5">
        <div className="mb-1.5">
          <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Enabled Categories</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Select cache categories to scan</div>
        </div>
        <div className="flex flex-wrap gap-2">
          {categoryOptions.map((cat) => {
            const enabled = settings.enabled_categories.includes(cat.value);
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => toggleCategory(cat.value)}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  enabled
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                }`}
              >
                {enabled ? "✓" : "+"} {cat.label}
              </button>
            );
          })}
        </div>
      </div>
      <SettingsSelect
        label="Minimum Safety Level"
        description="Minimum safety classification for cleanup"
        value={settings.min_safety_level}
        options={[
          { value: "safe", label: "Safe only" },
          { value: "moderate", label: "Safe & Moderate" },
          { value: "risky", label: "All levels" },
        ]}
        onChange={(v) => onChange({ min_safety_level: v as MockCacheCleanerSettings["min_safety_level"] })}
      />
      <SettingsToggle
        label="Dry Run by Default"
        description="Preview changes before executing cleanup"
        checked={settings.dry_run_by_default}
        onChange={(v) => onChange({ dry_run_by_default: v })}
      />
      <SettingsTextInput
        label="Cleanup Rules Path"
        description="Directory containing YAML cache detection rules"
        value={settings.cleanup_rules_path}
        placeholder="C:\Users\.petabyte\rules"
        onChange={(v) => onChange({ cleanup_rules_path: v })}
      />
    </SettingsSectionCard>
  );
}
