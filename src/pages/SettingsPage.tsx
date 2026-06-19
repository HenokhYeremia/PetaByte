import { useState, useCallback } from "react";
import { clsx } from "clsx";
import { useSettingsStore } from "@/stores/settingsStore";
import {
  GeneralSettings,
  ScannerSettings,
  DuplicateSettings,
  MoveSettings,
  CacheCleanerSettings,
  HealthScoreSettings,
  AppSettings,
} from "@/components/settings";
import {
  Globe,
  ScanLine,
  Copy,
  ArrowRightFromLine,
  Trash2,
  HeartPulse,
  Settings,
  Check,
  RotateCcw,
} from "lucide-react";

type SettingsTab =
  | "general"
  | "scanner"
  | "duplicate"
  | "move"
  | "cache"
  | "health"
  | "app";

const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: "general", label: "General", icon: <Globe className="h-4 w-4" /> },
  { id: "scanner", label: "Scanner", icon: <ScanLine className="h-4 w-4" /> },
  { id: "duplicate", label: "Duplicates", icon: <Copy className="h-4 w-4" /> },
  { id: "move", label: "Smart Move", icon: <ArrowRightFromLine className="h-4 w-4" /> },
  { id: "cache", label: "Cache Cleaner", icon: <Trash2 className="h-4 w-4" /> },
  { id: "health", label: "Health Score", icon: <HeartPulse className="h-4 w-4" /> },
  { id: "app", label: "Application", icon: <Settings className="h-4 w-4" /> },
];

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");

  const {
    settings,
    status,
    loading,
    error,
    dirty,
    updateGeneral,
    updateScanner,
    updateDuplicate,
    updateMove,
    updateCacheCleaner,
    updateHealthScore,
    updateApp,
    save,
    reset,
    discard,
  } = useSettingsStore();

  const handleExport = useCallback(() => {
    // Placeholder — will invoke Tauri command
  }, []);

  const handleImport = useCallback(() => {
    // Placeholder — will invoke Tauri command
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Settings</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Configure scan exclusions, profiles, thresholds, and application preferences.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {dirty && (
            <span className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Unsaved changes
            </span>
          )}
          {status === "saved" && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
              <Check className="h-3.5 w-3.5" />
              Saved
            </span>
          )}
          {error && (
            <span className="text-xs text-red-500">{error}</span>
          )}
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-800 dark:bg-zinc-800/50">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100"
                : "text-zinc-600 hover:bg-white/50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900/50 dark:hover:text-zinc-100",
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "general" && (
        <GeneralSettings
          settings={settings.general}
          onChange={updateGeneral}
          loading={loading}
          error={error}
        />
      )}
      {activeTab === "scanner" && (
        <ScannerSettings
          settings={settings.scanner}
          onChange={updateScanner}
          loading={loading}
          error={error}
        />
      )}
      {activeTab === "duplicate" && (
        <DuplicateSettings
          settings={settings.duplicate}
          onChange={updateDuplicate}
          loading={loading}
          error={error}
        />
      )}
      {activeTab === "move" && (
        <MoveSettings
          settings={settings.move}
          onChange={updateMove}
          loading={loading}
          error={error}
        />
      )}
      {activeTab === "cache" && (
        <CacheCleanerSettings
          settings={settings.cache_cleaner}
          onChange={updateCacheCleaner}
          loading={loading}
          error={error}
        />
      )}
      {activeTab === "health" && (
        <HealthScoreSettings
          settings={settings.health_score}
          onChange={updateHealthScore}
          loading={loading}
          error={error}
        />
      )}
      {activeTab === "app" && (
        <AppSettings
          settings={settings.app}
          onChange={updateApp}
          onExport={handleExport}
          onImport={handleImport}
          loading={loading}
          error={error}
        />
      )}

      <div className="flex items-center justify-end gap-3 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        {dirty && (
          <button
            type="button"
            onClick={discard}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <RotateCcw className="h-4 w-4" />
            Discard
          </button>
        )}
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Reset to Defaults
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || status === "saving"}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-400"
        >
          {status === "saving" ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Saving...
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              Save Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
}
