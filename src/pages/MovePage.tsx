import { useCallback, useMemo } from "react";
import { MoveSummarySection } from "@/components/move/MoveSummarySection";
import { DestinationSelector } from "@/components/move/DestinationSelector";
import { MovePreviewSection } from "@/components/move/MovePreviewSection";
import { ConflictResolution } from "@/components/move/ConflictResolution";
import { MoveExecutionPanel } from "@/components/move/MoveExecutionPanel";
import { UndoCenterPreview } from "@/components/move/UndoCenterPreview";
import { useMoveStore } from "@/stores/moveStore";
import {
  mockSelectedItems,
  mockSuggestedLocations,
  mockRecentDestinations,
  mockMoveOperations,
  mockMoveProgress,
  mockUndoJournal,
} from "@/mocks/move";

export function MovePage() {
  const {
    selectedItems,
    destination,
    destinationError,
    suggestedLocations,
    recentDestinations,
    operations,
    progress,
    status,
    filter,
    undoJournal,
    selectedUndoId,
    loading,
    setDestination,
    setDestinationError,
    updateFilter,
    setSelectedUndoId,
    setLoading,
    setResolution,
    setAllResolutions,
    startMove,
    cancelMove,
    pauseMove,
    resumeMove,
  } = useMoveStore();

  const summaryStats = useMemo(() => {
    if (selectedItems.length === 0) return { selectedFiles: 0, totalSize: 0, estimatedSavings: 0 };
    const totalSize = selectedItems.reduce((s, i) => s + i.size, 0);
    return {
      selectedFiles: selectedItems.length,
      totalSize,
      estimatedSavings: totalSize * 0.85,
    };
  }, [selectedItems]);

  const handleLoadData = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      useMoveStore.setState({
        selectedItems: mockSelectedItems,
        destination: "",
        destinationError: null,
        suggestedLocations: mockSuggestedLocations,
        recentDestinations: mockRecentDestinations,
        operations: mockMoveOperations,
        progress: mockMoveProgress,
        status: "previewing",
        undoJournal: mockUndoJournal,
        selectedUndoId: null,
        loading: false,
      });
    }, 300);
  }, [setLoading]);

  const handleBrowse = useCallback(() => {
    setDestination("D:\\Archive\\Selected");
  }, [setDestination]);

  const handleStart = useCallback(() => {
    if (!destination) {
      setDestinationError("Please select a destination folder");
      return;
    }
    startMove();
  }, [destination, startMove, setDestinationError]);

  const hasData = operations.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Smart Move</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Move files safely with journaled undo
          </p>
        </div>
        {!hasData && !loading && (
          <button
            type="button"
            onClick={handleLoadData}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
          >
            Load Move Data
          </button>
        )}
      </div>

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
              destinationError={destinationError}
              suggestedLocations={suggestedLocations}
              recentDestinations={recentDestinations}
              onDestinationChange={setDestination}
              onBrowse={handleBrowse}
              onClear={() => setDestination("")}
              loading={false}
            />

            <MovePreviewSection
              operations={operations}
              filter={filter}
              onFilterChange={updateFilter}
              onSetResolution={setResolution}
              onSetAllResolutions={setAllResolutions}
              loading={false}
            />

            <ConflictResolution
              operations={operations}
              onSetResolution={setResolution}
              onSetAllResolutions={setAllResolutions}
              loading={false}
            />
          </div>

          <div className="space-y-6">
            <MoveExecutionPanel
              status={status}
              progress={progress}
              onStart={handleStart}
              onCancel={cancelMove}
              onPause={pauseMove}
              onResume={resumeMove}
              disabled={!destination}
              loading={false}
            />

            <UndoCenterPreview
              entries={undoJournal}
              selectedId={selectedUndoId}
              onSelect={setSelectedUndoId}
              loading={false}
            />
          </div>
        </div>
      )}

      {!hasData && !loading && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-zinc-500 dark:text-zinc-400">
            No move data loaded. Click "Load Move Data" to populate with sample data.
          </p>
        </div>
      )}
    </div>
  );
}
