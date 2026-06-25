import { ArrowRightFromLine } from "lucide-react";
import { SettingsSectionCard, SettingsSelect, SettingsTextInput, SettingsNumberInput } from "./SettingsPrimitives";
import type { MoveSettings } from "@/types";

interface MoveSettingsProps {
  settings: MoveSettings;
  onChange: (partial: Partial<MoveSettings>) => void;
  loading?: boolean;
  error?: string | null;
}

export function MoveSettings({ settings, onChange, loading, error }: MoveSettingsProps) {
  return (
    <SettingsSectionCard
      title="Smart Move"
      description="Default destination, conflict resolution, and undo retention"
      icon={<ArrowRightFromLine className="h-5 w-5" />}
      loading={loading}
      error={error}
    >
      <SettingsTextInput
        label="Default Destination"
        description="Default target directory for file moves"
        value={settings.default_destination}
        placeholder="D:\PetaByte\MovedFiles"
        onChange={(v) => onChange({ default_destination: v })}
      />
      <SettingsSelect
        label="Conflict Resolution"
        description="Behavior when a file already exists at the destination"
        value={settings.conflict_strategy}
        options={[
          { value: "ask", label: "Ask each time" },
          { value: "overwrite", label: "Overwrite existing" },
          { value: "skip", label: "Skip conflicts" },
          { value: "rename", label: "Auto-rename new files" },
        ]}
        onChange={(v) => onChange({ conflict_strategy: v as MoveSettings["conflict_strategy"] })}
      />
      <SettingsNumberInput
        label="Undo Retention"
        description="Days to keep move journal entries for undo"
        value={settings.undo_retention_days}
        min={1}
        max={365}
        onChange={(v) => onChange({ undo_retention_days: v ?? 30 })}
      />
    </SettingsSectionCard>
  );
}
