import { useCallback, useRef } from "react";
import { ScanConfigPanel } from "@/components/scanner/ScanConfigPanel";
import { ScanControlPanel } from "@/components/scanner/ScanControlPanel";
import { ScanProgressSection } from "@/components/scanner/ScanProgressSection";
import { ScanResultSummary } from "@/components/scanner/ScanResultSummary";
import { RecentScanHistory } from "@/components/scanner/RecentScanHistory";
import { useScanStore } from "@/stores/scanStore";
import { mockScanProgress, mockScanResult, mockScanHistory } from "@/mocks/scanner";
import type { MockScanResult } from "@/mocks/scanner";

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
    setScanResult,
    setScanHistory,
    setSelectedHistoryId,
  } = useScanStore();

  const currentProgressRef = useRef(currentProgress);
  currentProgressRef.current = currentProgress;

  const handleStart = useCallback(() => {
    if (!selectedPath) {
      setPathError("Please select a folder to scan");
      return;
    }
    setStatus("scanning");
    setCurrentProgress({ ...mockScanProgress, status: "scanning" });
    setScanResult(null);
  }, [selectedPath, setStatus, setCurrentProgress, setScanResult, setPathError]);

  const handlePause = useCallback(() => {
    setStatus("paused");
    setCurrentProgress({ ...mockScanProgress, status: "paused" });
  }, [setStatus, setCurrentProgress]);

  const handleResume = useCallback(() => {
    setStatus("scanning");
    setCurrentProgress({ ...mockScanProgress, status: "scanning" });
  }, [setStatus, setCurrentProgress]);

  const handleCancel = useCallback(() => {
    const cp = currentProgressRef.current;
    setStatus("cancelled");
    setCurrentProgress(cp ? { ...cp, status: "cancelled" as const } : null);
    const totalFiles = cp?.scanned_files ?? 0;
    const result: MockScanResult = {
      ...mockScanResult,
      status: "cancelled",
      total_files: totalFiles,
      total_size: cp?.scanned_size ?? 0,
      total_directories: cp?.total_directories ?? 0,
      duration_secs: cp?.elapsed_secs ?? 0,
    };
    setScanResult(result);
    if (selectedPath) {
      setScanHistory([
        {
          id: `hist-${Date.now()}`,
          path: selectedPath,
          total_files: totalFiles,
          total_directories: cp?.total_directories ?? 0,
          total_size: cp?.scanned_size ?? 0,
          duration_secs: cp?.elapsed_secs ?? 0,
          status: "cancelled",
          started_at: new Date().toISOString(),
        },
        ...scanHistory,
      ]);
    }
  }, [setStatus, setCurrentProgress, setScanResult, selectedPath, scanHistory, setScanHistory]);

  const handleBrowse = useCallback(() => {
    setSelectedPath("D:\\Projects\\petabyte");
  }, [setSelectedPath]);

  const canStart = status === "idle" || status === "completed" || status === "cancelled" || status === "failed";
  const isScanActive = status === "scanning" || status === "paused";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Filesystem Scanner</h1>
      </div>

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

      {isScanActive && (
        <ScanProgressSection progress={currentProgress} />
      )}

      {scanResult && (
        <ScanResultSummary result={scanResult} />
      )}

      <RecentScanHistory
        history={scanHistory.length > 0 ? scanHistory : mockScanHistory}
        onSelect={setSelectedHistoryId}
        selectedId={selectedHistoryId}
      />
    </div>
  );
}
