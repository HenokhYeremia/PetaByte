import { useCallback, useMemo } from "react";
import { DuplicateSummarySection } from "@/components/duplicates/DuplicateSummarySection";
import { SearchAndFilter } from "@/components/duplicates/SearchAndFilter";
import { DuplicateGroupList } from "@/components/duplicates/DuplicateGroupList";
import { DuplicateDetailsPanel } from "@/components/duplicates/DuplicateDetailsPanel";
import { useDuplicateStore } from "@/stores/duplicateStore";
import { mockDuplicateGroups, mockDuplicateSummary } from "@/mocks/duplicates";
import type { MockSortConfig } from "@/mocks/duplicates";
function matchesFilter(group: { common_parent: string; extensions: string[]; file_count: number; file_size: number }, filter: { folder: string; extensions: string[]; countMin: number | null; countMax: number | null; sizeMin: number | null; sizeMax: number | null }) {
  const { folder, extensions, countMin, countMax, sizeMin, sizeMax } = filter;

  if (folder && !group.common_parent.toLowerCase().includes(folder.toLowerCase())) return false;
  if (extensions.length > 0 && !extensions.some((ext) => group.extensions.includes(ext))) return false;
  if (countMin !== null && group.file_count < countMin) return false;
  if (countMax !== null && group.file_count > countMax) return false;
  if (sizeMin !== null && group.file_size < sizeMin) return false;
  if (sizeMax !== null && group.file_size > sizeMax) return false;

  return true;
}

function sortGroups(groups: typeof mockDuplicateGroups, config: MockSortConfig) {
  return [...groups].sort((a, b) => {
    let cmp: number;
    switch (config.field) {
      case "file_size":
        cmp = a.file_size - b.file_size;
        break;
      case "file_count":
        cmp = a.file_count - b.file_count;
        break;
      case "total_wasted_bytes":
        cmp = a.total_wasted_bytes - b.total_wasted_bytes;
        break;
      case "extension":
        cmp = (a.extensions[0] || "").localeCompare(b.extensions[0] || "");
        break;
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
    selectedGroupId,
    selectedFileIds,
    filter,
    sortConfig,
    setGroups,
    setSummary,
    setLoading,
    selectGroup,
    toggleFile,
    toggleGroup,
    updateFilter,
    setSortField,
    toggleSortDirection,
    previewMove,
    previewDelete,
    smartMove,
    exportReport,
  } = useDuplicateStore();

  const filtered = useMemo(() => groups.filter((g) => matchesFilter(g, filter)), [groups, filter]);
  const sorted = useMemo(() => sortGroups(filtered, sortConfig), [filtered, sortConfig]);
  const selectedGroup = useMemo(
    () => (selectedGroupId ? groups.find((g) => g.id === selectedGroupId) ?? null : null),
    [groups, selectedGroupId],
  );

  const handleLoadData = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      setGroups(mockDuplicateGroups);
      setSummary(mockDuplicateSummary);
    }, 300);
  }, [setGroups, setSummary, setLoading]);

  const handleStartScan = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      setGroups(mockDuplicateGroups);
      setSummary(mockDuplicateSummary);
    }, 300);
  }, [setGroups, setSummary, setLoading]);

  const handleSelectAll = useCallback(
    (select: boolean) => {
      if (selectedGroup) {
        for (const f of selectedGroup.files) {
          const next = new Set(selectedFileIds);
          if (select) next.add(f.id);
          else next.delete(f.id);
          useDuplicateStore.setState({ selectedFileIds: next });
        }
      }
    },
    [selectedGroup, selectedFileIds],
  );

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
            onClick={handleStartScan}
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
            filter={filter}
            onFilterChange={updateFilter}
            sortConfig={sortConfig}
            onSortChange={setSortField}
            onSortDirectionToggle={toggleSortDirection}
          />

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]">
            <DuplicateGroupList
              groups={sorted}
              selectedGroupId={selectedGroupId}
              selectedFileIds={selectedFileIds}
              onSelectGroup={selectGroup}
              onToggleGroup={toggleGroup}
              onToggleFile={toggleFile}
            />

            {showDetails && (
              <div className="xl:block">
                <DuplicateDetailsPanel
                  group={selectedGroup}
                  selectedFileIds={selectedFileIds}
                  onToggleFile={toggleFile}
                  onSelectAll={handleSelectAll}
                  onPreviewMove={previewMove}
                  onPreviewDelete={previewDelete}
                  onSmartMove={smartMove}
                  onExportReport={exportReport}
                />
              </div>
            )}
          </div>
        </>
      )}

      {!hasData && !loading && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-zinc-500 dark:text-zinc-400">
            No duplicate data loaded. Click "Load Duplicate Data" to populate with sample data.
          </p>
        </div>
      )}
    </div>
  );
}
