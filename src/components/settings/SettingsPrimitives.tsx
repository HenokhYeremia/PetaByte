import { clsx } from "clsx";
import type { ReactNode } from "react";

interface ToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function SettingsToggle({ label, description, checked, onChange, disabled }: ToggleProps) {
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
        {description && <div className="text-xs text-zinc-500 dark:text-zinc-400">{description}</div>}
      </div>
    </label>
  );
}

interface SelectProps {
  label: string;
  description?: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function SettingsSelect({ label, description, value, options, onChange, disabled }: SelectProps) {
  return (
    <div className="flex items-center justify-between gap-4 px-3 py-2.5">
      <div>
        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{label}</div>
        {description && <div className="text-xs text-zinc-500 dark:text-zinc-400">{description}</div>}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-44 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

interface TextInputProps {
  label: string;
  description?: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string | null;
}

export function SettingsTextInput({ label, description, value, placeholder, onChange, disabled, error }: TextInputProps) {
  return (
    <div className="px-3 py-2.5">
      <div className="mb-1.5">
        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{label}</div>
        {description && <div className="text-xs text-zinc-500 dark:text-zinc-400">{description}</div>}
      </div>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={clsx(
          "w-full rounded-md border bg-white px-3 py-1.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 disabled:opacity-50 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500",
          error
            ? "border-red-300 focus:border-red-500 focus:ring-red-500/20 dark:border-red-700"
            : "border-zinc-300 focus:border-emerald-500 focus:ring-emerald-500/20 dark:border-zinc-700",
        )}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

interface NumberInputProps {
  label: string;
  description?: string;
  value: number | null;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number | null) => void;
  disabled?: boolean;
}

export function SettingsNumberInput({ label, description, value, placeholder, min, max, step, onChange, disabled }: NumberInputProps) {
  return (
    <div className="flex items-center justify-between gap-4 px-3 py-2.5">
      <div>
        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{label}</div>
        {description && <div className="text-xs text-zinc-500 dark:text-zinc-400">{description}</div>}
      </div>
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
        disabled={disabled}
        className="w-28 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-right text-sm text-zinc-900 placeholder-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500"
      />
    </div>
  );
}

interface TextListInputProps {
  label: string;
  description?: string;
  values: string[];
  placeholder?: string;
  onChange: (values: string[]) => void;
  disabled?: boolean;
}

export function SettingsTextListInput({ label, description, values, placeholder, onChange, disabled }: TextListInputProps) {
  return (
    <div className="px-3 py-2.5">
      <div className="mb-1.5">
        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{label}</div>
        {description && <div className="text-xs text-zinc-500 dark:text-zinc-400">{description}</div>}
      </div>
      <div className="space-y-2">
        {values.map((v, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="text"
              value={v}
              placeholder={placeholder}
              onChange={(e) => {
                const next = [...values];
                next[i] = e.target.value;
                onChange(next);
              }}
              disabled={disabled}
              className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500"
            />
            <button
              type="button"
              onClick={() => onChange(values.filter((_, j) => j !== i))}
              disabled={disabled}
              className="rounded-md px-2 py-1.5 text-sm text-red-500 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-900/20"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange([...values, ""])}
          disabled={disabled}
          className="text-sm font-medium text-emerald-600 hover:text-emerald-500 disabled:opacity-50 dark:text-emerald-400"
        >
          + Add Rule
        </button>
      </div>
    </div>
  );
}

interface SectionCardProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  loading?: boolean;
  error?: string | null;
}

export function SettingsSectionCard({ title, description, icon, children, loading, error }: SectionCardProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex items-center gap-3">
          <div className="h-5 w-5 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-5 w-40 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-9 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-white p-6 dark:border-red-800 dark:bg-zinc-900">
        <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
          <span className="text-lg">!</span>
          <p className="text-sm font-medium">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-3 border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
        {icon && <span className="text-zinc-500 dark:text-zinc-400">{icon}</span>}
        <div>
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
          {description && <p className="text-xs text-zinc-500 dark:text-zinc-400">{description}</p>}
        </div>
      </div>
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {children}
      </div>
    </div>
  );
}
