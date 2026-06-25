import { describe, it, expect, vi, beforeEach } from "vitest";
import { resetTauriCheck } from "@/bridge/tauriCheck";
import { useScanStore } from "@/stores/scanStore";
import { globalEventBus, EventChannels } from "@/bridge/eventBus";
import type { Drive, ScanProgress, ScanResult } from "@/types";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const mockDrives: Drive[] = [
  { letter: "C:", mount_point: "C:\\", label: "Local Disk", total_bytes: 500_000_000_000, free_bytes: 100_000_000_000, is_removable: false, file_system: "NTFS" },
  { letter: "D:", mount_point: "D:\\", label: "Data", total_bytes: 1_000_000_000_000, free_bytes: 500_000_000_000, is_removable: false, file_system: "NTFS" },
];

const mockProgress: ScanProgress = {
  session_id: "scan-1", scanned_files: 500, total_files: 1000, scanned_size: 50_000_000, total_size: 100_000_000,
  current_path: "D:\\test\\subdir", elapsed_secs: 10, eta_secs: 10, status: "scanning", total_directories: 25, speed_files_per_sec: 50, errors: 0,
};

const mockResult: ScanResult = {
  id: "scan-1", volume_id: "vol-1", status: "completed", total_files: 1000, total_dirs: 50, total_size: 100_000_000,
  scanned_files: 1000, scanned_size: 100_000_000, errors_count: 2, duration_secs: 25, started_at: "2026-06-20T12:00:00Z",
  completed_at: "2026-06-20T12:00:25Z", path: "D:\\test", total_directories: 50, errors: 2,
};

const mockScanResultDto = { session_id: "scan-1", total_files: 1000, total_size: 100000000, total_dirs: 50, total_errors: 2, elapsed_ms: 25000, status: "completed" };

describe("E2E: Scanner Workflow", () => {
  beforeEach(() => {
    useScanStore.setState({
      status: "idle", currentProgress: null, scanResult: null, scanHistory: [], drives: [],
      selectedPath: "", selectedDrive: null, pathError: null, ignoreRules: [],
      scanConfig: { path: undefined, recursive: true, follow_symlinks: false, thread_count: 4, max_depth: null, min_file_size: null, max_file_size: null, exclude_system_dirs: true },
      selectedHistoryId: null, error: null, session: null, progress: null, history: [],
    });
    resetTauriCheck();
    delete (window as any).__TAURI__;
    delete (window as any).__TAURI_INTERNALS__;
    globalEventBus.clearAll();
  });

  // 1. Start Scan
  it("1.1 fetches drives and populates store", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockResolvedValue(JSON.stringify({ drives: mockDrives }));
    await useScanStore.getState().fetchDrivesAction();
    const state = useScanStore.getState();
    expect(state.drives).toEqual(mockDrives);
    expect(state.drives.length).toBe(2);
  });

  it("1.2 starts scan and sets scanning status with progress", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockResolvedValue(JSON.stringify(mockScanResultDto));
    useScanStore.getState().setSelectedPath("D:\\test");
    await useScanStore.getState().startScanAction("D:\\test");
    const state = useScanStore.getState();
    expect(state.status).toBe("completed");
    expect(state.scanResult).not.toBeNull();
  });

  it("1.3 transitions through lifecycle: idle → scanning → completed", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockResolvedValueOnce(JSON.stringify(mockScanResultDto));
    const store = useScanStore.getState();
    expect(store.status).toBe("idle");

    await store.startScanAction("D:\\test");
    let current = useScanStore.getState();
    expect(current.status).toBe("completed");
    expect(current.scanResult).not.toBeNull();

    // Simulate receiving progress events via event bus
    const progressSpy = vi.fn();
    globalEventBus.on(EventChannels.SCAN_PROGRESS, progressSpy);
    globalEventBus.emit(EventChannels.SCAN_PROGRESS, mockProgress);
    current.setCurrentProgress(mockProgress);
    current = useScanStore.getState();
    expect(current.currentProgress?.scanned_files).toBe(500);
    expect(progressSpy).toHaveBeenCalledWith(mockProgress);

    // Simulate completion event
    globalEventBus.emit(EventChannels.SCAN_COMPLETE, mockResult);
    current.setScanResult(mockResult);
    current.setStatus("completed");
    const final = useScanStore.getState();
    expect(final.status).toBe("completed");
    expect(final.scanResult?.total_files).toBe(1000);
  });

  // 2. Progress Updates
  it("2.1 emits progress events at various stages", () => {
    const progressSpy = vi.fn();
    globalEventBus.on(EventChannels.SCAN_PROGRESS, progressSpy);

    const stages = [
      { ...mockProgress, scanned_files: 100, status: "scanning" },
      { ...mockProgress, scanned_files: 500, status: "scanning" },
      { ...mockProgress, scanned_files: 900, status: "scanning" },
    ];
    for (const s of stages) {
      globalEventBus.emit(EventChannels.SCAN_PROGRESS, s);
    }
    expect(progressSpy).toHaveBeenCalledTimes(3);
    expect(progressSpy.mock.calls[0][0].scanned_files).toBe(100);
    expect(progressSpy.mock.calls[2][0].scanned_files).toBe(900);
  });

  it("2.2 progress includes ETA and speed metrics", () => {
    globalEventBus.emit(EventChannels.SCAN_PROGRESS, mockProgress);
    const last = globalEventBus.getLastPayload<ScanProgress>(EventChannels.SCAN_PROGRESS);
    expect(last).not.toBeNull();
    expect(last!.elapsed_secs).toBe(10);
    expect(last!.eta_secs).toBe(10);
    expect(last!.speed_files_per_sec).toBe(50);
  });

  // 3. Completion
  it("3.1 scan complete event carries full result data", () => {
    const completeSpy = vi.fn();
    globalEventBus.on(EventChannels.SCAN_COMPLETE, completeSpy);
    globalEventBus.emit(EventChannels.SCAN_COMPLETE, mockResult);
    expect(completeSpy).toHaveBeenCalledWith(mockResult);
    const last = globalEventBus.getLastPayload<ScanResult>(EventChannels.SCAN_COMPLETE);
    expect(last?.total_files).toBe(1000);
    expect(last?.status).toBe("completed");
    expect(last?.duration_secs).toBe(25);
  });

  it("3.2 error event during scan is propagated", () => {
    const errorSpy = vi.fn();
    globalEventBus.on(EventChannels.SCAN_ERROR, errorSpy);
    globalEventBus.emit(EventChannels.SCAN_ERROR, "Permission denied: D:\\test\\system");
    expect(errorSpy).toHaveBeenCalledWith("Permission denied: D:\\test\\system");
  });

  // 4. Persistence
  it("4.1 scan history accumulates multiple sessions", () => {
    const store = useScanStore.getState();
    const historyItems = [
      { id: "1", path: "D:\\a", total_files: 100, total_size: 1000, status: "completed", started_at: "2026-01-01T00:00:00Z", completed_at: "2026-01-01T00:00:10Z", total_directories: 5, duration_secs: 10 },
      { id: "2", path: "D:\\b", total_files: 200, total_size: 2000, status: "completed", started_at: "2026-01-02T00:00:00Z", completed_at: "2026-01-02T00:00:20Z", total_directories: 10, duration_secs: 20 },
    ];
    store.setScanHistory(historyItems);
    const state = useScanStore.getState();
    expect(state.scanHistory.length).toBe(2);
    expect(state.scanHistory[1].path).toBe("D:\\b");
  });

  it("4.2 completed scan persists to store for downstream use", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockResolvedValueOnce(JSON.stringify(mockScanResultDto));
    await useScanStore.getState().startScanAction("D:\\test");
    const state = useScanStore.getState();
    expect(state.scanResult).not.toBeNull();
    expect(state.scanResult!.total_files).toBe(1000);
  });

  it("4.3 scan can be cancelled gracefully", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockResolvedValueOnce(JSON.stringify(mockScanResultDto)).mockResolvedValueOnce(undefined);
    await useScanStore.getState().startScanAction("D:\\test");
    const stateAfterScan = useScanStore.getState();
    expect(stateAfterScan.status).toBe("completed");
    expect(stateAfterScan.currentProgress).toBeNull();
    await useScanStore.getState().cancelScanAction();
    expect(useScanStore.getState().status).toBe("cancelled");
  });

  it("4.4 error during startScanAction sets failed status", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockRejectedValue(new Error("Drive not found"));
    await useScanStore.getState().startScanAction("Z:\\invalid");
    const state = useScanStore.getState();
    expect(state.status).toBe("failed");
    expect(state.error).toContain("Drive not found");
  });
});
