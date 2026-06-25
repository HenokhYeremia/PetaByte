import { useCallback, useMemo } from "react";
import { DuplicateSummarySection } from "@/components/duplicates/DuplicateSummarySection";
import { SearchAndFilter } from "@/components/duplicates/SearchAndFilter";
import { DuplicateGroupList } from "@/components/duplicates/DuplicateGroupList";
import { DuplicateDetailsPanel } from "@/components/duplicates/DuplicateDetailsPanel";
import { useDuplicateStore } from "@/stores/duplicateStore";
import type { DuplicateGroup, DuplicateSortConfig } from "@/types";

function matchesFilter(group: DuplicateGroup, filter: { folder: string; extensions: string[]; countMin: number | null; countMax: number | null; sizeMin: number | null; sizeMax: number | null }) {
  const { folder, extensions, countMin, countMax, sizeMin, sizeMax } = filter;
  const extSet = new Set(group.files.map((f) => f.name.split(".").pop() ?? "").filter(Boolean));
  const commonParent = group.files.length > 0
    ? group.files.reduce((_p, f) => { const parts = f.path.split(/[/\\]/); return parts.slice(0, -1).join("/"); }, "")
    : "";
  if (folder && !commonParent.toLowerCase().includes(folder.toLowerCase())) return false;
  if (extensions.length > 0 && !extensions.some((ext) => extSet.has(ext))) return false;
  if (countMin !== null && group.file_count < countMin) return false;
  if (countMax !== null && group.file_count > countMax) return false;
  if (sizeMin !== null && group.file_size < sizeMin) return false;
  if (sizeMax !== null && group.file_size > sizeMax) return false;
  return true;
}

function sortGroups(groups: DuplicateGroup[], config: DuplicateSortConfig) {
  return [...groups].sort((a, b) => {
    let cmp: number;
    switch (config.field) {
      case "size":
        cmp = a.file_size - b.file_size;
        break;
      case "count":
        cmp = a.file_count - b.file_count;
        break;
      case "wasted":
        cmp = a.total_wasted_bytes - b.total_wasted_bytes;
        break;
      case "name": {
        const aName = a.files[0]?.name ?? "";
        const bName = b.files[0]?.name ?? "";
        cmp = aName.localeCompare(bName);
        break;
      }
      default:
        cmp = 0;
    }
    return config.direction === "desc" ? -cmp : cmp;
  });
}

export function DuplicatesPage() {
  const {
    groups,
    summary,
    loading,
    error,
    selectedGroupId,
    selectedFileIds,
    filterState,
    sortConfig,
    setFilterState,
    setSortConfig,
    toggleFile,
    selectAllGroup,
    fetchDuplicatesAction,
  } = useDuplicateStore();

  const advancedFilter = useMemo(() => {
    return { folder: "", extensions: [] as string[], countMin: null as number | null, countMax: null as number | null, sizeMin: null as number | null, sizeMax: null as number | null };
  }, []);

  const filtered = useMemo(() => groups.filter((g) => matchesFilter(g, advancedFilter)), [groups, advancedFilter]);
  const sorted = useMemo(() => sortGroups(filtered, sortConfig), [filtered, sortConfig]);
  const selectedGroup = useMemo(
    () => (selectedGroupId ? groups.find((g) => g.id === selectedGroupId) ?? null : null),
    [groups, selectedGroupId],
  );

  const handleLoadData = useCallback(async () => {
    await fetchDuplicatesAction();
  }, [fetchDuplicatesAction]);

  const handleSelectAll = useCallback((select: boolean) => {
    if (selectedGroup) selectAllGroup(selectedGroup.id, select);
  }, [selectedGroup, selectAllGroup]);

  const hasData = groups.length > 0;
  const showDetails = selectedGroupId !== null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Duplicate Files</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Find and manage duplicate files on your filesystem
          </p>
        </div>
        {!hasData && !loading && (
          <button
            type="button"
            onClick={handleLoadData}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
          >
            Load Duplicate Data
          </button>
        )}
        {hasData && (
          <button
            type="button"
            onClick={handleLoadData}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
          >
            Run Scan
          </button>
        )}
      </div>

      <DuplicateSummarySection summary={summary} loading={loading} />

      {hasData && (
        <>
          <SearchAndFilter
            filter={filterState}
            onFilterChange={(p) => setFilterState(p)}
            sortConfig={sortConfig}
            onSortChange={(field) => setSortConfig({ field, direction: sortConfig.direction })}
            onSortDirectionToggle={() => setSortConfig({ field: sortConfig.field, direction: sortConfig.direction === "asc" ? "desc" : "asc" })}
          />

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]">
            <DuplicateGroupList
              groups={sorted}
              selectedGroupId={selectedGroupId}
              selectedFileIds={selectedFileIds}
              onSelectGroup={(id) => useDuplicateStore.getState().setSelectedGroupId(id)}
              onToggleGroup={(id, select) => selectAllGroup(id, select)}
              onToggleFile={toggleFile}
            />

            {showDetails && (
              <div className="xl:block">
                <DuplicateDetailsPanel
                  group={selectedGroup!}
                  selectedFileIds={selectedFileIds}
                  onToggleFile={toggleFile}
                  onSelectAll={handleSelectAll}
                  onPreviewMove={() => {}}
                  onPreviewDelete={() => {}}
                  onSmartMove={() => {}}
                  onExportReport={() => {}}
                />
              </div>
            )}
          </div>
        </>
      )}

      {!hasData && !loading && !error && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-zinc-500 dark:text-zinc-400">
            No duplicate data loaded. Click &ldquo;Load Duplicate Data&rdquo; to scan for duplicates.
          </p>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          Failed to load duplicates: {error}
        </div>
      )}
    </div>
  );
}
