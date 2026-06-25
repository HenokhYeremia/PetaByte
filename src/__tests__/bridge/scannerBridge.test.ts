import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchDrives, startScanTauri, cancelScanTauri } from "@/bridge/scanner";
import { resetTauriCheck } from "@/bridge/tauriCheck";
import type { Drive } from "@/types";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const mockDrive: Drive = {
  letter: "C:",
  mount_point: "C:\\",
  label: "Local Disk",
  total_bytes: 500_000_000_000,
  free_bytes: 100_000_000_000,
  is_removable: false,
  file_system: "NTFS",
};

describe("scannerBridge", () => {
  beforeEach(() => {
    resetTauriCheck();
    delete (window as any).__TAURI__;
    delete (window as any).__TAURI_INTERNALS__;
  });

  describe("fetchDrives", () => {
    it("returns drives from invoke", async () => {
      const { invoke } = await import("@tauri-apps/api/core");
      vi.mocked(invoke).mockResolvedValue(JSON.stringify({ drives: [mockDrive] }));
      const drives = await fetchDrives();
      expect(drives).toEqual([mockDrive]);
    });
  });

  describe("startScanTauri", () => {
    it("returns session id from invoke", async () => {
      const { invoke } = await import("@tauri-apps/api/core");
      vi.mocked(invoke).mockResolvedValue("session-123");
      const result = await startScanTauri("/test/path");
      expect(result).toBe("session-123");
      expect(invoke).toHaveBeenCalledWith("start_scan", { rootPath: "/test/path" });
    });
  });

  describe("cancelScanTauri", () => {
    it("calls invoke to cancel scan", async () => {
      const { invoke } = await import("@tauri-apps/api/core");
      vi.mocked(invoke).mockResolvedValue(undefined);
      await expect(cancelScanTauri()).resolves.toBeUndefined();
      expect(invoke).toHaveBeenCalledWith("cancel_scan");
    });
  });
});
