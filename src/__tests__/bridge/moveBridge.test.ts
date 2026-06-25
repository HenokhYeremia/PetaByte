import { describe, it, expect, vi, beforeEach } from "vitest";
import { moveFileTauri, undoMoveTauri, fetchMoveHistoryTauri, moveFileDryRunTauri } from "@/bridge/move";
import { resetTauriCheck } from "@/bridge/tauriCheck";
import type { MoveResultDto } from "@/types";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const mockResult: MoveResultDto = {
  operation_id: "op-1",
  source_path: "/source/file.txt",
  destination_path: "/dest/file.txt",
  file_size: 1024,
  status: "completed",
  error: null,
};

describe("moveBridge", () => {
  beforeEach(() => {
    resetTauriCheck();
    delete (window as any).__TAURI__;
  });

  describe("moveFileTauri", () => {
    it("returns MoveResultDto from invoke", async () => {
      const { invoke } = await import("@tauri-apps/api/core");
      vi.mocked(invoke).mockResolvedValue(mockResult);
      const result = await moveFileTauri("/source/file.txt", "/dest", 1024, false);
      expect(result.operation_id).toBe("op-1");
      expect(result.status).toBe("completed");
      expect(result.error).toBeNull();
    });

    it("passes parameters correctly", async () => {
      const { invoke } = await import("@tauri-apps/api/core");
      vi.mocked(invoke).mockResolvedValue(mockResult);
      const result = await moveFileTauri("/source/file.txt", "/dest", 1024, false);
      expect(result).toBeDefined();
      expect(invoke).toHaveBeenCalledWith("move_file", { sourcePath: "/source/file.txt", destinationPath: "/dest", fileSize: 1024, useTrash: false });
    });
  });

  describe("moveFileDryRunTauri", () => {
    it("delegates to moveFileTauri with useTrash=true", async () => {
      const { invoke } = await import("@tauri-apps/api/core");
      vi.mocked(invoke).mockResolvedValue(mockResult);
      const result = await moveFileDryRunTauri("/source/file.txt", "/dest", 1024);
      expect(result.operation_id).toBe("op-1");
      expect(invoke).toHaveBeenCalledWith("move_file", { sourcePath: "/source/file.txt", destinationPath: "/dest", fileSize: 1024, useTrash: true });
    });
  });

  describe("undoMoveTauri", () => {
    it("calls invoke to undo move", async () => {
      const { invoke } = await import("@tauri-apps/api/core");
      vi.mocked(invoke).mockResolvedValue(undefined);
      await expect(undoMoveTauri("op-1")).resolves.toBeUndefined();
      expect(invoke).toHaveBeenCalledWith("undo_move", { operationId: "op-1" });
    });
  });

  describe("fetchMoveHistoryTauri", () => {
    it("returns journal from invoke", async () => {
      const { invoke } = await import("@tauri-apps/api/core");
      vi.mocked(invoke).mockResolvedValue(JSON.stringify([]));
      const journal = await fetchMoveHistoryTauri();
      expect(Array.isArray(journal)).toBe(true);
    });
  });
});
