import { Globe } from "lucide-react";
import { SettingsSectionCard, SettingsSelect } from "./SettingsPrimitives";
import type { GeneralSettings } from "@/types";

interface GeneralSettingsProps {
  settings: GeneralSettings;
  onChange: (partial: Partial<GeneralSettings>) => void;
  loading?: boolean;
  error?: string | null;
}

export function GeneralSettings({ settings, onChange, loading, error }: GeneralSettingsProps) {
  return (
    <SettingsSectionCard
      title="General"
      description="Language, theme, and startup preferences"
      icon={<Globe className="h-5 w-5" />}
      loading={loading}
      error={error}
    >
      <SettingsSelect
        label="Language"
        description="Application display language"
        value={settings.language}
        options={[
          { value: "en", label: "English" },
          { value: "id", label: "Bahasa Indonesia" },
          { value: "ja", label: "日本語" },
          { value: "zh", label: "中文" },
        ]}
        onChange={(v) => onChange({ language: v })}
      />
      <SettingsSelect
        label="Theme"
        description="Application color scheme"
        value={settings.theme}
        options={[
          { value: "light", label: "Light" },
          { value: "dark", label: "Dark" },
          { value: "system", label: "System" },
        ]}
        onChange={(v) => onChange({ theme: v as GeneralSettings["theme"] })}
      />
      <SettingsSelect
        label="Startup Behavior"
        description="What to show when the app opens"
        value={settings.startup_behavior}
        options={[
          { value: "remember_last", label: "Remember Last Page" },
          { value: "open_scanner", label: "Open Scanner" },
          { value: "open_dashboard", label: "Open Dashboard" },
          { value: "stay_idle", label: "Stay Idle" },
        ]}
        onChange={(v) => onChange({ startup_behavior: v as GeneralSettings["startup_behavior"] })}
      />
    </SettingsSectionCard>
  );
}
