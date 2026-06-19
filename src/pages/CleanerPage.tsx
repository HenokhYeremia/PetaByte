import { useCallback, useMemo } from "react";
import { CacheSummarySection } from "@/components/cleaner/CacheSummarySection";
import { CacheCategoryPanel } from "@/components/cleaner/CacheCategoryPanel";
import { CacheSearchFilter } from "@/components/cleaner/CacheSearchFilter";
import { CacheDetailsTable } from "@/components/cleaner/CacheDetailsTable";
import { CacheCleanupPreview } from "@/components/cleaner/CacheCleanupPreview";
import { CacheActions } from "@/components/cleaner/CacheActions";
import { useCleanerStore } from "@/stores/cleanerStore";
import { mockCategories, mockCacheSummary, computeCleanupPreview } from "@/mocks/cache";

export function CleanerPage() {
  const {
    categories,
    summary,
    filter,
    preview,
    status,
    loading,
    setCategories,
    setSummary,
    updateFilter,
    setPreview,
    setStatus,
    setLoading,
    selectAll,
    selectEntry,
    analyze,
    previewCleanup,
    startCleanup,
    cancelCleanup,
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

  const handleAnalyze = useCallback(() => {
    analyze();
    setTimeout(() => {
      setCategories(mockCategories);
      setSummary(mockCacheSummary);
      setStatus("previewing");
    }, 300);
  }, [analyze, setCategories, setSummary, setStatus]);

  const handlePreviewCleanup = useCallback(() => {
    const p = computeCleanupPreview(categories);
    setPreview(p);
    previewCleanup();
  }, [categories, setPreview, previewCleanup]);

  const handleStartCleanup = useCallback(() => {
    startCleanup();
    setTimeout(() => {
      setStatus("completed");
    }, 300);
  }, [startCleanup, setStatus]);

  const handleLoadData = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      setCategories(mockCategories);
      setSummary(mockCacheSummary);
    }, 300);
  }, [setCategories, setSummary, setLoading]);

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

      {hasData && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_1fr]">
          <div className="space-y-6">
            <CacheCategoryPanel
              categories={categories}
              selectedCategoryId={null}
              onSelectCategory={() => {}}
              loading={false}
            />
            <CacheCleanupPreview
              preview={preview}
              loading={false}
            />
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <CacheSearchFilter
                filter={filter}
                categories={categoryOptions}
                onFilterChange={updateFilter}
              />
              <CacheActions
                status={status}
                hasSelection={hasSelection}
                onAnalyze={handleAnalyze}
                onPreview={handlePreviewCleanup}
                onClean={handleStartCleanup}
                onCancel={cancelCleanup}
                loading={false}
              />
            </div>

            <CacheDetailsTable
              categories={categories}
              filter={filter}
              onSelectEntry={selectEntry}
              onSelectAll={selectAll}
              loading={false}
            />
          </div>
        </div>
      )}

      {!hasData && !loading && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-zinc-500 dark:text-zinc-400">
            No cache data loaded. Click "Load Cache Data" to populate with sample data.
          </p>
        </div>
      )}
    </div>
  );
}
