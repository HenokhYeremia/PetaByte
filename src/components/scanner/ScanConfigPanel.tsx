import { DriveSelector } from "@/components/scanner/DriveSelector";
import { FolderSelector } from "@/components/scanner/FolderSelector";
import { IgnoreRulesPreview } from "@/components/scanner/IgnoreRulesPreview";
import { ScanOptions } from "@/components/scanner/ScanOptions";
import type { MockDrive, MockIgnoreRule, MockScanConfig } from "@/mocks/scanner";

interface ScanConfigPanelProps {
  drives: MockDrive[];
  selectedDrive: string | null;
  onSelectDrive: (mountPoint: string) => void;
  path: string;
  onPathChange: (path: string) => void;
  onBrowse?: () => void;
  pathError?: string | null;
  ignoreRules: MockIgnoreRule[];
  onToggleIgnoreRule: (id: string) => void;
  onAddIgnoreRule?: () => void;
  scanConfig: MockScanConfig;
  onScanConfigChange: (config: Partial<MockScanConfig>) => void;
  loading?: boolean;
}

export function ScanConfigPanel({
  drives,
  selectedDrive,
  onSelectDrive,
  path,
  onPathChange,
  onBrowse,
  pathError,
  ignoreRules,
  onToggleIgnoreRule,
  onAddIgnoreRule,
  scanConfig,
  onScanConfigChange,
  loading,
}: ScanConfigPanelProps) {
  return (
    <div className="space-y-6">
      <DriveSelector
        drives={drives}
        selected={selectedDrive}
        onSelect={onSelectDrive}
        loading={loading}
      />
      <FolderSelector
        path={path}
        onPathChange={onPathChange}
        onBrowse={onBrowse}
        error={pathError}
        loading={loading}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <IgnoreRulesPreview
          rules={ignoreRules}
          onToggle={onToggleIgnoreRule}
          onAddRule={onAddIgnoreRule}
          loading={loading}
        />
        <ScanOptions
          config={scanConfig}
          onChange={onScanConfigChange}
          loading={loading}
        />
      </div>
    </div>
  );
}
