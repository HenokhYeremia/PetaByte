import { useCallback, useMemo } from "react";
import { MoveSummarySection } from "@/components/move/MoveSummarySection";
import { DestinationSelector } from "@/components/move/DestinationSelector";
import { MovePreviewSection } from "@/components/move/MovePreviewSection";
import { ConflictResolution } from "@/components/move/ConflictResolution";
import { MoveExecutionPanel } from "@/components/move/MoveExecutionPanel";
import { UndoCenterPreview } from "@/components/move/UndoCenterPreview";
import { useMoveStore } from "@/stores/moveStore";

export function MovePage() {
  const {
    selectedItems,
    destination,
    suggestedLocations,
    recentDestinations,
    operations,
    progress,
    status,
    filterState,
    undoJournal,
    loading,
    error,
    setDestination,
    setFilterState,
    setResolution,
    startMoveAction,
  } = useMoveStore();

  const summaryStats = useMemo(() => {
    if (selectedItems.length === 0) return { selectedFiles: 0, totalSize: 0, estimatedSavings: 0 };
    const totalSize = selectedItems.reduce((s, i) => s + i.size, 0);
    return { selectedFiles: selectedItems.length, totalSize, estimatedSavings: totalSize * 0.85 };
  }, [selectedItems]);

  const handleBrowse = useCallback(() => {
    setDestination("");
  }, [setDestination]);

  const handleStart = useCallback(async () => {
    if (!destination) return;
    await startMoveAction(selectedItems.map((i) => i.path), destination);
  }, [destination, selectedItems, startMoveAction]);

  const hasData = operations.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Smart Move</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Move files safely with journaled undo</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <MoveSummarySection
        selectedFiles={summaryStats.selectedFiles}
        totalSize={summaryStats.totalSize}
        estimatedSavings={summaryStats.estimatedSavings}
        loading={loading}
      />

      {hasData && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]">
          <div className="space-y-6">
            <DestinationSelector
              destination={destination}
              destinationError={null}
              suggestedLocations={suggestedLocations}
              recentDestinations={recentDestinations}
              onDestinationChange={setDestination}
              onBrowse={handleBrowse}
              onClear={() => setDestination("")}
              loading={loading}
            />

            <MovePreviewSection
              operations={operations}
              filter={filterState}
              onFilterChange={(p) => setFilterState(p)}
              onSetResolution={setResolution}
              onSetAllResolutions={() => {}}
              loading={loading}
            />

            <ConflictResolution
              operations={operations}
              onSetResolution={setResolution}
              onSetAllResolutions={() => {}}
              loading={loading}
            />
          </div>

          <div className="space-y-6">
            <MoveExecutionPanel
              status={status}
              progress={progress}
              onStart={handleStart}
              onCancel={() => {}}
              onPause={() => {}}
              onResume={() => {}}
              disabled={!destination}
              loading={loading}
            />

            <UndoCenterPreview
              entries={undoJournal}
              selectedId={null}
              onSelect={() => {}}
              loading={loading}
            />
          </div>
        </div>
      )}

      {!hasData && !loading && !error && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-zinc-500 dark:text-zinc-400">
            No move operations yet. Select files and a destination to begin.
          </p>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        </div>
      )}
    </div>
  );
}
