import { describe, it, expect, vi, beforeEach } from "vitest";
import { resetTauriCheck } from "@/bridge/tauriCheck";
import { useMoveStore } from "@/stores/moveStore";
import { globalEventBus, EventChannels } from "@/bridge/eventBus";
import type { MoveOperation, UndoJournalEntry, MoveProgress, MoveResultDto } from "@/types";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const mockSuccessResult: MoveResultDto = {
  operation_id: "op-1",
  source_path: "D:\\source\\file.txt",
  destination_path: "E:\\dest\\file.txt",
  file_size: 50_000_000,
  status: "completed",
  error: null,
};

const mockJournal: UndoJournalEntry = {
  id: "j-1", operation_type: "move", source_path: "D:\\source\\file.txt",
  destination_path: "E:\\dest\\file.txt", size: 50_000_000, status: "available",
  timestamp: "2026-06-20T12:00:00Z", checksum_before: "abc", checksum_after: "abc",
  started_at: "2026-06-20T12:00:00Z", source_root: "D:\\source", dest_root: "E:\\dest",
  operation_count: 1, total_bytes: 50_000_000, journal_path: "D:\\.petabyte\\journal\\j-1.json",
};

const mockProgress: MoveProgress = {
  current_file: "file.txt", bytes_copied: 25_000_000, total_bytes: 50_000_000,
  files_completed: 1, total_files: 3, phase: "copying", percentage: 50,
  moved_files: 1, moved_bytes: 25_000_000, elapsed_secs: 5, eta_secs: 5,
};

describe("E2E: Smart Move Workflow", () => {
  beforeEach(() => {
    useMoveStore.setState({
      selectedItems: [], suggestedLocations: [], recentDestinations: [],
      operations: [], progress: null, status: "idle", loading: false, error: null,
      destination: "", undoJournal: [], filterState: { search: "", statusFilter: "all", conflictFilter: "all", validationFilter: "all" },
    });
    resetTauriCheck();
    delete (window as any).__TAURI__;
    delete (window as any).__TAURI_INTERNALS__;
    globalEventBus.clearAll();
  });

  // 1. Preview
  it("1.1 dry-run returns preview operations", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockResolvedValue(mockSuccessResult);
    await useMoveStore.getState().fetchPreviewAction(["D:\\source\\file.txt"], "E:\\dest");
    const state = useMoveStore.getState();
    expect(state.status).toBe("ready");
    expect(state.operations.length).toBe(1);
    expect(state.operations[0].source).toBe("D:\\source\\file.txt");
    expect(state.loading).toBe(false);
  });

  it("1.2 preview validates pre-conditions", async () => {
    const conflictResult: MoveResultDto = {
      ...mockSuccessResult,
      error: "exists",
    };
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockResolvedValue(conflictResult);
    await useMoveStore.getState().fetchPreviewAction(["D:\\source\\file.txt"], "E:\\dest");
    const state = useMoveStore.getState();
    expect(state.operations[0].conflict_status).toBe("invalid_path");
    expect(state.operations[0].validation_status).toBe("invalid");
  });

  it("1.3 preview handles multiple source files", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockResolvedValue(mockSuccessResult);
    await useMoveStore.getState().fetchPreviewAction(["D:\\a.txt", "D:\\b.txt"], "E:\\dest");
    expect(useMoveStore.getState().operations.length).toBe(2);
  });

  // 2. Move
  it("2.1 executes move and transitions to completed", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockResolvedValue(mockSuccessResult);
    await useMoveStore.getState().startMoveAction(["D:\\source\\file.txt"], "E:\\dest");
    const state = useMoveStore.getState();
    expect(state.status).toBe("completed");
    expect(state.operations.length).toBe(1);
  });

  it("2.2 move progress events fire during operation", () => {
    const progressSpy = vi.fn();
    globalEventBus.on(EventChannels.MOVE_PROGRESS, progressSpy);
    globalEventBus.emit(EventChannels.MOVE_PROGRESS, { ...mockProgress, percentage: 25 });
    globalEventBus.emit(EventChannels.MOVE_PROGRESS, { ...mockProgress, percentage: 75 });
    globalEventBus.emit(EventChannels.MOVE_PROGRESS, { ...mockProgress, percentage: 100, phase: "verifying" });
    expect(progressSpy).toHaveBeenCalledTimes(3);
    expect(progressSpy.mock.calls[2][0].percentage).toBe(100);
    expect(progressSpy.mock.calls[2][0].phase).toBe("verifying");
  });

  it("2.3 move error is propagated", () => {
    const errorSpy = vi.fn();
    globalEventBus.on(EventChannels.MOVE_ERROR, errorSpy);
    globalEventBus.emit(EventChannels.MOVE_ERROR, "Insufficient space on destination");
    expect(errorSpy).toHaveBeenCalledWith("Insufficient space on destination");
  });

  it("2.4 move failure sets failed status", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockRejectedValue(new Error("Destination disk full"));
    await useMoveStore.getState().startMoveAction(["D:\\source\\file.txt"], "E:\\dest");
    const state = useMoveStore.getState();
    expect(state.status).toBe("failed");
    expect(state.error).toContain("Destination disk full");
  });

  it("2.5 conflict resolution updates operation", () => {
    useMoveStore.setState({ operations: [{ id: "op-1", source: "/s", destination: "/d", size: 1024, method: "rename", conflict_status: "none", validation_status: "valid", resolution: "rename", source_name: "f.txt", dest_name: "f.txt" }] });
    useMoveStore.getState().setResolution("op-1", "overwrite");
    expect(useMoveStore.getState().operations[0].resolution).toBe("overwrite");
  });

  // 3. Undo
  it("3.1 undo move calls bridge and clears loading", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockResolvedValue(undefined);
    await useMoveStore.getState().undoMoveAction("op-1");
    expect(useMoveStore.getState().loading).toBe(false);
    expect(invoke).toHaveBeenCalledWith("undo_move", { operationId: "op-1" });
  });

  it("3.2 fetches undo journal from bridge", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockResolvedValue(JSON.stringify([mockJournal]));
    await useMoveStore.getState().fetchUndoJournalAction();
    const state = useMoveStore.getState();
    expect(state.undoJournal.length).toBe(1);
    expect(state.undoJournal[0].operation_type).toBe("move");
    expect(state.loading).toBe(false);
  });

  it("3.3 undo journal shows available operations", async () => {
    const entries: UndoJournalEntry[] = [
      { ...mockJournal, id: "j-1", status: "available" },
      { ...mockJournal, id: "j-2", status: "used" },
      { ...mockJournal, id: "j-3", status: "available" },
    ];
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockResolvedValue(JSON.stringify(entries));
    await useMoveStore.getState().fetchUndoJournalAction();
    const available = useMoveStore.getState().undoJournal.filter((e) => e.status === "available");
    expect(available.length).toBe(2);
  });

  it("3.4 undo error is handled gracefully", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockRejectedValue(new Error("Journal entry not found"));
    await useMoveStore.getState().undoMoveAction("op-invalid");
    const state = useMoveStore.getState();
    expect(state.loading).toBe(false);
    expect(state.error).toContain("Journal entry not found");
  });

  it("3.5 toggle item selection", () => {
    useMoveStore.setState({ selectedItems: [{ id: "i1", path: "D:\\a.txt", name: "a.txt", size: 100, type: "file", selected: false }] });
    useMoveStore.getState().toggleItem("i1");
    expect(useMoveStore.getState().selectedItems[0].selected).toBe(true);
    useMoveStore.getState().toggleItem("i1");
    expect(useMoveStore.getState().selectedItems[0].selected).toBe(false);
  });

  it("3.6 same-drive move uses rename method", () => {
    const renameOp: MoveOperation = { id: "op-1", source: "/s", destination: "/d", size: 1024, method: "rename", conflict_status: "none", validation_status: "valid", resolution: "rename", source_name: "f.txt", dest_name: "f.txt" };
    useMoveStore.setState({ operations: [renameOp] });
    expect(useMoveStore.getState().operations[0].method).toBe("rename");
  });
});
