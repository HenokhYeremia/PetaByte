import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Settings2 } from "lucide-react";
import { clsx } from "clsx";
import type { MockScanConfig } from "@/mocks/scanner";

interface ScanOptionsProps {
  config: MockScanConfig;
  onChange: (config: Partial<MockScanConfig>) => void;
  loading?: boolean;
}

interface ToggleFieldProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function ToggleField({ label, description, checked, onChange, disabled }: ToggleFieldProps) {
  return (
    <label className={clsx(
      "flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
      disabled && "opacity-50",
    )}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 dark:border-zinc-700"
      />
      <div>
        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{label}</div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">{description}</div>
      </div>
    </label>
  );
}

interface NumberFieldProps {
  label: string;
  value: number | null;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number | null) => void;
}

function NumberField({ label, value, placeholder, min, max, step, onChange }: NumberFieldProps) {
  return (
    <div className="flex items-center justify-between gap-4 px-3 py-2">
      <label className="text-sm text-zinc-700 dark:text-zinc-300">{label}</label>
      <div className="relative w-28">
        <input
          type="number"
          value={value ?? ""}
          placeholder={placeholder}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v === "" ? null : Number(v));
          }}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-right text-sm text-zinc-900 placeholder-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500"
        />
      </div>
    </div>
  );
}

export function ScanOptions({ config, onChange, loading }: ScanOptionsProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Scan Options</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-9 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scan Options</CardTitle>
        <Settings2 className="h-4 w-4 text-zinc-400" />
      </CardHeader>
      <CardContent className="space-y-1">
        <ToggleField
          label="Recursive"
          description="Scan subdirectories recursively"
          checked={config.recursive}
          onChange={(v) => onChange({ recursive: v })}
        />
        <ToggleField
          label="Follow Symlinks"
          description="Follow symbolic links (may escape scan root)"
          checked={config.follow_symlinks}
          onChange={(v) => onChange({ follow_symlinks: v })}
          disabled={!config.recursive}
        />
        {config.recursive && (
          <NumberField
            label="Max Depth"
            value={config.max_depth}
            placeholder="Unlimited"
            min={1}
            max={100}
            onChange={(v) => onChange({ max_depth: v })}
          />
        )}
        <div className="my-2 border-t border-zinc-100 dark:border-zinc-800" />
        <NumberField
          label="Min File Size"
          value={config.min_file_size}
          placeholder="No limit"
          min={0}
          step={1024}
          onChange={(v) => onChange({ min_file_size: v })}
        />
        <NumberField
          label="Max File Size"
          value={config.max_file_size}
          placeholder="No limit"
          min={0}
          step={1024}
          onChange={(v) => onChange({ max_file_size: v })}
        />
        <div className="my-2 border-t border-zinc-100 dark:border-zinc-800" />
        <NumberField
          label="Threads"
          value={config.thread_count}
          min={1}
          max={32}
          onChange={(v) => onChange({ thread_count: v ?? 4 })}
        />
      </CardContent>
    </Card>
  );
}
