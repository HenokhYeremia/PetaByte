import { useCallback, useMemo } from "react";
import { CacheSummarySection } from "@/components/cleaner/CacheSummarySection";
import { CacheCategoryPanel } from "@/components/cleaner/CacheCategoryPanel";
import { CacheSearchFilter } from "@/components/cleaner/CacheSearchFilter";
import { CacheDetailsTable } from "@/components/cleaner/CacheDetailsTable";
import { CacheCleanupPreview } from "@/components/cleaner/CacheCleanupPreview";
import { CacheActions } from "@/components/cleaner/CacheActions";
import { useCleanerStore } from "@/stores/cleanerStore";

export function CleanerPage() {
  const {
    categories,
    summary,
    filter,
    preview,
    status,
    loading,
    error,
    setFilter,
    selectAll,
    toggleEntry,
    fetchCacheData,
    previewCleanup,
    startCleanupAction,
    setStatus,
  } = useCleanerStore();

  const hasData = categories.length > 0;

  const categoryOptions = useMemo(
    () => categories.map((c) => ({ id: c.id, display_name: c.display_name })),
    [categories],
  );

  const hasSelection = useMemo(
    () => categories.some((c) => c.entries.some((e) => e.selected)),
    [categories],
  );

  const handleAnalyze = useCallback(async () => { await fetchCacheData(); }, [fetchCacheData]);
  const handlePreviewCleanup = useCallback(() => { previewCleanup(); }, [previewCleanup]);
  const handleStartCleanup = useCallback(async () => { await startCleanupAction(); }, [startCleanupAction]);
  const handleLoadData = useCallback(async () => { await fetchCacheData(); }, [fetchCacheData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Cache Cleaner</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Detect and safely remove developer cache files
          </p>
        </div>
        {!hasData && !loading && (
          <button
            type="button"
            onClick={handleLoadData}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
          >
            Load Cache Data
          </button>
        )}
      </div>

      <CacheSummarySection
        totalCacheSize={summary?.total_cache_size ?? 0}
        potentialSavings={summary?.potential_savings ?? 0}
        categoryCount={summary?.category_count ?? 0}
        lastAnalysis={summary?.last_analysis ?? null}
        loading={loading}
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        </div>
      )}

      {hasData && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_1fr]">
          <div className="space-y-6">
            <CacheCategoryPanel
              categories={categories}
              selectedCategoryId={null}
              onSelectCategory={() => {}}
              loading={false}
            />
            <CacheCleanupPreview preview={preview} loading={false} />
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <CacheSearchFilter
                filter={filter}
                categories={categoryOptions}
                onFilterChange={setFilter}
              />
              <CacheActions
                status={status}
                hasSelection={hasSelection}
                onAnalyze={handleAnalyze}
                onPreview={handlePreviewCleanup}
                onClean={handleStartCleanup}
                onCancel={() => setStatus("ready")}
                loading={false}
              />
            </div>

            <CacheDetailsTable
              categories={categories}
              filter={filter}
              onSelectEntry={toggleEntry}
              onSelectAll={selectAll}
              loading={false}
            />
          </div>
        </div>
      )}

      {!hasData && !loading && !error && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-zinc-500 dark:text-zinc-400">
            No cache data loaded. Click &ldquo;Load Cache Data&rdquo; to analyze cache usage.
          </p>
        </div>
      )}
    </div>
  );
}
