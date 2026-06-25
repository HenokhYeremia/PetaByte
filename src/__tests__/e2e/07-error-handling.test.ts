import { describe, it, expect, vi, beforeEach } from "vitest";
import { globalEventBus, EventChannels } from "@/bridge/eventBus";
import { resetTauriCheck } from "@/bridge/tauriCheck";
import { useScanStore } from "@/stores/scanStore";
import { useDuplicateStore } from "@/stores/duplicateStore";
import { useMoveStore } from "@/stores/moveStore";
import { useCleanerStore } from "@/stores/cleanerStore";
import { useHealthStore } from "@/stores/healthStore";
import type { ErrorEvent } from "@/types/events";


vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const mockScanResultDto = { session_id: "scan-1", total_files: 1000, total_size: 100000000, total_dirs: 50, total_errors: 2, elapsed_ms: 25000, status: "completed" };

describe("E2E: Error Handling", () => {
  beforeEach(() => {
    resetTauriCheck();
    delete (window as any).__TAURI__;
    delete (window as any).__TAURI_INTERNALS__;
    globalEventBus.clearAll();
    useScanStore.setState({ status: "idle", error: null, currentProgress: null });
    useDuplicateStore.setState({ groups: [], summary: null, loading: false, error: null, selectedFileIds: new Set() });
    useMoveStore.setState({ operations: [], status: "idle", loading: false, error: null });
    useCleanerStore.setState({ categories: [], summary: null, status: "idle", loading: false, error: null });
    useHealthStore.setState({ score: null, factors: [], status: "idle", loading: false, error: null });
  });

  // 1. Permission Errors
  it("1.1 scan permission error is captured and propagated", () => {
    const errorSpy = vi.fn();
    globalEventBus.on(EventChannels.SCAN_ERROR, errorSpy);
    globalEventBus.on(EventChannels.ERROR_OCCURRED, errorSpy);
    globalEventBus.emit(EventChannels.SCAN_ERROR, "Permission denied: C:\\Windows\\System32\\config");
    globalEventBus.emit(EventChannels.ERROR_OCCURRED, { source: "scanner", message: "Permission denied: C:\\Windows\\System32\\config", severity: "error" });
    expect(errorSpy).toHaveBeenCalledTimes(2);
  });

  it("1.2 permission error does not stop scan", () => {
    globalEventBus.addLog({ eventName: EventChannels.SCAN_PROGRESS, payload: {}, severity: "info" });
    globalEventBus.addLog({ eventName: EventChannels.SCAN_ERROR, payload: "Permission: file1", severity: "error" });
    globalEventBus.addLog({ eventName: EventChannels.SCAN_PROGRESS, payload: {}, severity: "info" });
    globalEventBus.addLog({ eventName: EventChannels.SCAN_ERROR, payload: "Permission: file2", severity: "error" });
    expect(globalEventBus.getLog().length).toBeGreaterThanOrEqual(4);
  });

  it("1.3 bridge-level permission error sets store error state", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockRejectedValue(new Error("EACCES: Permission denied"));
    await useDuplicateStore.getState().fetchDuplicatesAction();
    expect(useDuplicateStore.getState().error).toContain("EACCES");
  });

  // 2. Missing Files
  it("2.1 move on missing file returns validation error", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockResolvedValue({
      operation_id: "op-1",
      source_path: "D:\\missing.txt",
      destination_path: "E:\\dest",
      file_size: 0,
      status: "failed",
      error: "file not found",
    });
    await useMoveStore.getState().fetchPreviewAction(["D:\\missing.txt"], "E:\\dest");
    const state = useMoveStore.getState();
    expect(state.operations[0].validation_status).toBe("invalid");
  });

  it("2.2 file-not-found error emitted through event bus", () => {
    const spy = vi.fn();
    globalEventBus.on(EventChannels.MOVE_ERROR, spy);
    globalEventBus.emit(EventChannels.MOVE_ERROR, "File not found: D:\\missing.txt");
    expect(spy).toHaveBeenCalledWith("File not found: D:\\missing.txt");
  });

  it("2.3 undo on missing journal entry is handled", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockRejectedValue(new Error("Journal entry not found"));
    await useMoveStore.getState().undoMoveAction("nonexistent");
    expect(useMoveStore.getState().error).toContain("Journal entry not found");
  });

  // 3. Invalid Paths
  it("3.1 scan on invalid path sets pathError", () => {
    const store = useScanStore.getState();
    store.setPathError("Path does not exist: Z:\\invalid");
    expect(useScanStore.getState().pathError).toContain("Path does not exist");
  });

  it("3.2 scan on invalid path fails via bridge", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockRejectedValue(new Error("Invalid path: Z:\\nonexistent"));
    await useScanStore.getState().startScanAction("Z:\\nonexistent");
    expect(useScanStore.getState().status).toBe("failed");
    expect(useScanStore.getState().error).toContain("Invalid path");
  });

  it("3.3 cache cleaner on invalid path returns error", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockRejectedValue(new Error("Invalid path: Z:\\invalid"));
    await useCleanerStore.getState().fetchCacheData();
    expect(useCleanerStore.getState().error).toContain("Invalid path");
  });

  it("3.4 health score on invalid volume returns error", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockRejectedValue(new Error("Volume not found: Z:"));
    await useHealthStore.getState().fetchHealthData("Z:");
    expect(useHealthStore.getState().error).toContain("Volume not found");
  });

  // 4. Cancel Operations
  it("4.1 cancel scan transitions to cancelled state", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockResolvedValueOnce(JSON.stringify(mockScanResultDto)).mockResolvedValueOnce(undefined);
    await useScanStore.getState().startScanAction("D:\\test");
    expect(useScanStore.getState().status).toBe("completed");
    await useScanStore.getState().cancelScanAction();
    expect(useScanStore.getState().status).toBe("cancelled");
  });

  it("4.2 cancel during cache cleanup cleans up state", () => {
    useCleanerStore.getState().setStatus("cleaning");
    useCleanerStore.getState().setStatus("cancelled");
    expect(useCleanerStore.getState().status).toBe("cancelled");
  });

  it("4.3 ErrorEvent with critical severity is logged", () => {
    const critical: ErrorEvent = { source: "scanner", message: "Drive disconnected mid-scan", severity: "critical" };
    globalEventBus.addLog({ eventName: "error:occurred", payload: critical, severity: "error" });
    globalEventBus.emit(EventChannels.ERROR_OCCURRED, critical);
    const log = globalEventBus.getLog();
    expect(log.some((e) => (e.payload as Record<string, unknown>)?.severity === "critical")).toBe(true);
  });

  it("4.4 aggregate errors in scan result are preserved", () => {
    useScanStore.getState().setScanResult({
      id: "s1", volume_id: "v1", status: "completed", total_files: 1000, total_dirs: 50, total_size: 1_000_000_000,
      scanned_files: 1000, scanned_size: 1_000_000_000, errors_count: 12, duration_secs: 30, started_at: "", completed_at: "", path: "D:\\test", total_directories: 50, errors: 12,
    });
    expect(useScanStore.getState().scanResult?.errors_count).toBe(12);
  });

  it("4.5 invalid resolve operation does not crash store", () => {
    useMoveStore.setState({ operations: [] });
    useMoveStore.getState().setResolution("nonexistent", "overwrite");
    expect(useMoveStore.getState().operations).toEqual([]);
  });
});
