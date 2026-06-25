import { useCallback, useRef, useEffect } from "react";
import { ScanConfigPanel } from "@/components/scanner/ScanConfigPanel";
import { ScanControlPanel } from "@/components/scanner/ScanControlPanel";
import { ScanProgressSection } from "@/components/scanner/ScanProgressSection";
import { ScanResultSummary } from "@/components/scanner/ScanResultSummary";
import { RecentScanHistory } from "@/components/scanner/RecentScanHistory";
import { useScanStore } from "@/stores/scanStore";
import { useScanEvents } from "@/hooks/useTauri";

export function ScannerPage() {
  const {
    drives,
    selectedDrive,
    selectedPath,
    pathError,
    ignoreRules,
    scanConfig,
    status,
    currentProgress,
    scanResult,
    scanHistory,
    selectedHistoryId,
    setSelectedDrive,
    setSelectedPath,
    setPathError,
    setScanConfig,
    toggleIgnoreRule,
    setStatus,
    setCurrentProgress,
    setSelectedHistoryId,
    startScanAction,
    cancelScanAction,
    fetchDrivesAction,
    error,
  } = useScanStore();

  const { progress: eventProgress } = useScanEvents();
  const currentProgressRef = useRef(currentProgress);
  currentProgressRef.current = currentProgress;

  useEffect(() => {
    if (drives.length === 0) fetchDrivesAction();
  }, [drives.length, fetchDrivesAction]);

  useEffect(() => {
    if (eventProgress && status === "scanning") {
      setCurrentProgress(eventProgress);
    }
  }, [eventProgress, status, setCurrentProgress]);

  const handleStart = useCallback(async () => {
    if (!selectedPath) {
      setPathError("Please select a folder to scan");
      return;
    }
    await startScanAction(selectedPath);
  }, [selectedPath, startScanAction, setPathError]);

  const handlePause = useCallback(() => setStatus("paused"), [setStatus]);
  const handleResume = useCallback(() => setStatus("scanning"), [setStatus]);
  const handleCancel = useCallback(async () => { await cancelScanAction(); }, [cancelScanAction]);
  const handleBrowse = useCallback(() => setSelectedPath(""), [setSelectedPath]);

  const canStart = status === "idle" || status === "completed" || status === "cancelled" || status === "failed";
  const isScanActive = status === "scanning" || status === "paused";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Filesystem Scanner</h1>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {!isScanActive && (
        <ScanConfigPanel
          drives={drives}
          selectedDrive={selectedDrive}
          onSelectDrive={setSelectedDrive}
          path={selectedPath}
          onPathChange={setSelectedPath}
          onBrowse={handleBrowse}
          pathError={pathError}
          ignoreRules={ignoreRules}
          onToggleIgnoreRule={toggleIgnoreRule}
          scanConfig={scanConfig}
          onScanConfigChange={setScanConfig}
        />
      )}

      <ScanControlPanel
        status={status}
        onStart={handleStart}
        onPause={handlePause}
        onResume={handleResume}
        onCancel={handleCancel}
        disabled={!selectedPath && canStart}
      />

      {isScanActive && currentProgress && (
        <ScanProgressSection progress={currentProgress} />
      )}

      {scanResult && (
        <ScanResultSummary result={scanResult} />
      )}

      <RecentScanHistory
        history={scanHistory}
        onSelect={setSelectedHistoryId}
        selectedId={selectedHistoryId}
      />
    </div>
  );
}
