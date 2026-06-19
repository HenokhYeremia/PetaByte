import { HeartPulse } from "lucide-react";
import { SettingsSectionCard, SettingsSelect, SettingsNumberInput, SettingsToggle } from "./SettingsPrimitives";
import type { MockHealthScoreSettings } from "@/mocks/settings";

interface HealthScoreSettingsProps {
  settings: MockHealthScoreSettings;
  onChange: (partial: Partial<MockHealthScoreSettings>) => void;
  loading?: boolean;
  error?: string | null;
}

export function HealthScoreSettings({ settings, onChange, loading, error }: HealthScoreSettingsProps) {
  return (
    <SettingsSectionCard
      title="Health Score"
      description="Scoring sensitivity, anomaly detection, and recommendations"
      icon={<HeartPulse className="h-5 w-5" />}
      loading={loading}
      error={error}
    >
      <SettingsSelect
        label="Scoring Sensitivity"
        description="How aggressively the health score drops on issues"
        value={settings.scoring_sensitivity}
        options={[
          { value: "low", label: "Low (Forgiving)" },
          { value: "medium", label: "Medium (Balanced)" },
          { value: "high", label: "High (Strict)" },
        ]}
        onChange={(v) => onChange({ scoring_sensitivity: v as MockHealthScoreSettings["scoring_sensitivity"] })}
      />
      <SettingsToggle
        label="Show Anomalies"
        description="Flag sudden drops and spikes in health trend"
        checked={settings.show_anomalies}
        onChange={(v) => onChange({ show_anomalies: v })}
      />
      <SettingsToggle
        label="Auto-Analyze"
        description="Run health analysis automatically after each scan"
        checked={settings.auto_analyze}
        onChange={(v) => onChange({ auto_analyze: v })}
      />
      <SettingsNumberInput
        label="Recommendation Count"
        description="Number of recommendations to show (max)"
        value={settings.recommendation_count}
        min={1}
        max={20}
        onChange={(v) => onChange({ recommendation_count: v ?? 5 })}
      />
    </SettingsSectionCard>
  );
}
