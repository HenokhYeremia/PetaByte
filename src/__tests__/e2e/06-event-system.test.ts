import { describe, it, expect, vi, beforeEach } from "vitest";
import { globalEventBus, EventChannels } from "@/bridge/eventBus";
import { registerEventListeners } from "@/bridge/events";
import { resetTauriCheck } from "@/bridge/tauriCheck";
import type { ScanProgress, ScanResult } from "@/types";
import type { ErrorEvent, HealthComplete } from "@/types/events";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn().mockResolvedValue(vi.fn()),
}));

describe("E2E: Event System", () => {
  beforeEach(() => {
    globalEventBus.clearAll();
    resetTauriCheck();
    delete (window as any).__TAURI__;
    delete (window as any).__TAURI_INTERNALS__;
  });

  // 1. Event Emission
  it("1.1 emits all channel types through the bus", () => {
    const spy = vi.fn();
    const channels = Object.values(EventChannels);
    for (const ch of channels) {
      globalEventBus.on(ch, spy);
      globalEventBus.emit(ch, { channel: ch });
    }
    expect(spy).toHaveBeenCalledTimes(channels.length);
    for (const ch of channels) {
      const last = globalEventBus.getLastPayload(ch);
      expect(last).toEqual({ channel: ch });
    }
  });

  it("1.2 event emission is isolated per channel", () => {
    const scanSpy = vi.fn();
    const dupSpy = vi.fn();
    globalEventBus.on(EventChannels.SCAN_PROGRESS, scanSpy);
    globalEventBus.on(EventChannels.DUPLICATE_PROGRESS, dupSpy);
    globalEventBus.emit(EventChannels.SCAN_PROGRESS, { scanned_files: 50 } as ScanProgress);
    expect(scanSpy).toHaveBeenCalledTimes(1);
    expect(dupSpy).not.toHaveBeenCalled();
  });

  it("1.3 events carry correct payload types", () => {
    const progress: ScanProgress = {
      session_id: "s1", scanned_files: 100, total_files: 200, scanned_size: 5000, total_size: 10000,
      current_path: "/test", elapsed_secs: 5, eta_secs: 5, status: "scanning", total_directories: 10, speed_files_per_sec: 20, errors: 0,
    };
    globalEventBus.emit(EventChannels.SCAN_PROGRESS, progress);
    const last = globalEventBus.getLastPayload<ScanProgress>(EventChannels.SCAN_PROGRESS);
    expect(last?.scanned_files).toBe(100);
    expect(last?.total_files).toBe(200);
    expect(last?.speed_files_per_sec).toBe(20);
  });

  it("1.4 error events carry severity and source", () => {
    const err: ErrorEvent = { source: "scanner", message: "Permission denied", severity: "error" };
    globalEventBus.emit(EventChannels.ERROR_OCCURRED, err);
    const last = globalEventBus.getLastPayload<ErrorEvent>(EventChannels.ERROR_OCCURRED);
    expect(last?.severity).toBe("error");
    expect(last?.message).toBe("Permission denied");
  });

  // 2. Event Subscription
  it("2.1 multiple listeners can subscribe to same channel", () => {
    const spy1 = vi.fn();
    const spy2 = vi.fn();
    globalEventBus.on(EventChannels.SCAN_COMPLETE, spy1);
    globalEventBus.on(EventChannels.SCAN_COMPLETE, spy2);
    globalEventBus.emit(EventChannels.SCAN_COMPLETE, { id: "1" } as unknown as ScanResult);
    expect(spy1).toHaveBeenCalledTimes(1);
    expect(spy2).toHaveBeenCalledTimes(1);
  });

  it("2.2 unsubscribe removes specific listener", () => {
    const spy1 = vi.fn();
    const spy2 = vi.fn();
    const unsub = globalEventBus.on(EventChannels.MOVE_PROGRESS, spy1);
    globalEventBus.on(EventChannels.MOVE_PROGRESS, spy2);
    unsub();
    globalEventBus.emit(EventChannels.MOVE_PROGRESS, { current_file: "test" });
    expect(spy1).not.toHaveBeenCalled();
    expect(spy2).toHaveBeenCalledTimes(1);
  });

  it("2.3 once listener fires once then auto-unsubscribes", () => {
    const spy = vi.fn();
    globalEventBus.once(EventChannels.DUPLICATE_COMPLETE, spy);
    globalEventBus.emit(EventChannels.DUPLICATE_COMPLETE, { groups_found: 1, total_wasted_bytes: 100 });
    globalEventBus.emit(EventChannels.DUPLICATE_COMPLETE, { groups_found: 2, total_wasted_bytes: 200 });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("2.4 registerEventListeners with no Tauri returns noop unsubs", async () => {
    const unsubs = await registerEventListeners({});
    expect(unsubs.scanProgress).toBeDefined();
    expect(typeof unsubs.scanProgress).toBe("function");
    expect(unsubs.scanComplete).toBeDefined();
    expect(unsubs.unlistenAll).toBeDefined();
  });

  it("2.5 handler errors do not affect other handlers", () => {
    const badSpy = vi.fn().mockImplementation(() => { throw new Error("bad handler"); });
    const goodSpy = vi.fn();
    globalEventBus.on(EventChannels.HEALTH_COMPLETE, badSpy);
    globalEventBus.on(EventChannels.HEALTH_COMPLETE, goodSpy);
    const payload: HealthComplete = { overall_score: 85, grade: "B" };
    expect(() => globalEventBus.emit(EventChannels.HEALTH_COMPLETE, payload)).not.toThrow();
    expect(badSpy).toHaveBeenCalled();
    expect(goodSpy).toHaveBeenCalled();
  });

  // 3. Event Recovery
  it("3.1 recovery queue stores events for replay", () => {
    globalEventBus.queueForRecovery("scan:progress", { scanned_files: 50 });
    globalEventBus.queueForRecovery("scan:progress", { scanned_files: 100 });
    expect(globalEventBus.getRecoveryQueueSize()).toBe(2);
  });

  it("3.2 drainRecoveryQueue replays events in order", () => {
    const spy = vi.fn();
    globalEventBus.on("test:recovery", spy);
    globalEventBus.queueForRecovery("test:recovery", { step: 1 });
    globalEventBus.queueForRecovery("test:recovery", { step: 2 });
    globalEventBus.drainRecoveryQueue();
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy.mock.calls[0][0]).toEqual({ step: 1 });
    expect(spy.mock.calls[1][0]).toEqual({ step: 2 });
    expect(globalEventBus.getRecoveryQueueSize()).toBe(0);
  });

  it("3.3 recovery queue is cleared after drain", () => {
    globalEventBus.queueForRecovery("test:r", {});
    globalEventBus.drainRecoveryQueue();
    expect(globalEventBus.getRecoveryQueueSize()).toBe(0);
  });

  it("3.4 event log tracks all events with severity", () => {
    globalEventBus.addLog({ eventName: "scan:progress", payload: { v: 1 }, severity: "info" });
    globalEventBus.addLog({ eventName: "error:occurred", payload: { v: 2 }, severity: "error" });
    const log = globalEventBus.getLog();
    expect(log.length).toBe(2);
    expect(log[0].severity).toBe("info");
    expect(log[1].severity).toBe("error");
  });

  it("3.5 event log truncates at maxLogSize", () => {
    for (let i = 0; i < 600; i++) {
      globalEventBus.addLog({ eventName: "test", payload: { i }, severity: "info" });
    }
    expect(globalEventBus.getLog().length).toBe(500);
  });

  it("3.6 clearAll resets all state including recovery queue", () => {
    globalEventBus.emit(EventChannels.SCAN_PROGRESS, { scanned_files: 1 } as any);
    globalEventBus.queueForRecovery("test", {});
    globalEventBus.clearAll();
    expect(globalEventBus.getListenerCount(EventChannels.SCAN_PROGRESS)).toBe(0);
    expect(globalEventBus.getRecoveryQueueSize()).toBe(0);
    expect(globalEventBus.getLog().length).toBe(0);
  });
});
