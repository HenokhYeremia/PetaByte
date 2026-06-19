import { Copy } from "lucide-react";
import { SettingsSectionCard, SettingsSelect, SettingsNumberInput, SettingsToggle } from "./SettingsPrimitives";
import type { MockDuplicateSettings } from "@/mocks/settings";

interface DuplicateSettingsProps {
  settings: MockDuplicateSettings;
  onChange: (partial: Partial<MockDuplicateSettings>) => void;
  loading?: boolean;
  error?: string | null;
}

export function DuplicateSettings({ settings, onChange, loading, error }: DuplicateSettingsProps) {
  return (
    <SettingsSectionCard
      title="Duplicate Detection"
      description="Hash strategy, thresholds, and verification settings"
      icon={<Copy className="h-5 w-5" />}
      loading={loading}
      error={error}
    >
      <SettingsSelect
        label="Hash Strategy"
        description="Hash verification method for duplicate detection"
        value={settings.hash_strategy}
        options={[
          { value: "tiered", label: "Tiered (Size → Partial → Full)" },
          { value: "full", label: "Full Hash (All files)" },
        ]}
        onChange={(v) => onChange({ hash_strategy: v as MockDuplicateSettings["hash_strategy"] })}
      />
      <SettingsNumberInput
        label="Minimum Group Size"
        description="Minimum files in a group to flag as duplicates"
        value={settings.min_group_size}
        min={2}
        max={100}
        onChange={(v) => onChange({ min_group_size: v ?? 2 })}
      />
      <SettingsToggle
        label="Verify on Move"
        description="Re-verify hashes after files are moved"
        checked={settings.verify_on_move}
        onChange={(v) => onChange({ verify_on_move: v })}
      />
      <SettingsToggle
        label="Verify on Delete"
        description="Re-verify hashes before deleting marked files"
        checked={settings.verify_on_delete}
        onChange={(v) => onChange({ verify_on_delete: v })}
      />
    </SettingsSectionCard>
  );
}
