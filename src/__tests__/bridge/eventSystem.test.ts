import { describe, it, expect, vi, beforeEach } from "vitest";
import { globalEventBus, EventChannels } from "@/bridge/eventBus";

beforeEach(() => {
  globalEventBus.clearAll();
});

describe("GlobalEventBus", () => {
  it("emits and receives events", () => {
    const listener = vi.fn();
    globalEventBus.on("test:event", listener);
    globalEventBus.emit("test:event", { value: 42 });
    expect(listener).toHaveBeenCalledWith({ value: 42 });
  });

  it("supports multiple listeners on same channel", () => {
    const a = vi.fn();
    const b = vi.fn();
    globalEventBus.on("test:multi", a);
    globalEventBus.on("test:multi", b);
    globalEventBus.emit("test:multi", "payload");
    expect(a).toHaveBeenCalledWith("payload");
    expect(b).toHaveBeenCalledWith("payload");
  });

  it("unsubscribe removes listener", () => {
    const listener = vi.fn();
    const unsub = globalEventBus.on("test:unsub", listener);
    unsub();
    globalEventBus.emit("test:unsub", "data");
    expect(listener).not.toHaveBeenCalled();
  });

  it("once fires only once", () => {
    const listener = vi.fn();
    globalEventBus.once("test:once", listener);
    globalEventBus.emit("test:once", 1);
    globalEventBus.emit("test:once", 2);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(1);
  });

  it("getLastPayload returns most recent payload", () => {
    expect(globalEventBus.getLastPayload("test:last")).toBeNull();
    globalEventBus.emit("test:last", "hello");
    expect(globalEventBus.getLastPayload("test:last")).toBe("hello");
    globalEventBus.emit("test:last", "world");
    expect(globalEventBus.getLastPayload("test:last")).toBe("world");
  });

  it("getListenerCount returns correct number", () => {
    expect(globalEventBus.getListenerCount("test:count")).toBe(0);
    globalEventBus.on("test:count", () => {});
    expect(globalEventBus.getListenerCount("test:count")).toBe(1);
    globalEventBus.on("test:count", () => {});
    expect(globalEventBus.getListenerCount("test:count")).toBe(2);
  });

  it("clearChannel removes all listeners and last payload", () => {
    const listener = vi.fn();
    globalEventBus.on("test:clear", listener);
    globalEventBus.emit("test:clear", "data");
    expect(listener).toHaveBeenCalledOnce();

    globalEventBus.clearChannel("test:clear");
    expect(globalEventBus.getListenerCount("test:clear")).toBe(0);
    expect(globalEventBus.getLastPayload("test:clear")).toBeNull();
  });

  it("listener errors do not break other listeners", () => {
    const good = vi.fn();
    globalEventBus.on("test:error-safe", () => { throw new Error("boom"); });
    globalEventBus.on("test:error-safe", good);
    expect(() => globalEventBus.emit("test:error-safe", "data")).not.toThrow();
    expect(good).toHaveBeenCalledWith("data");
  });
});

describe("EventLog", () => {
  it("logs events with id and timestamp", () => {
    globalEventBus.addLog({ eventName: "test:log", payload: { x: 1 }, severity: "info" });
    const log = globalEventBus.getLog();
    expect(log).toHaveLength(1);
    expect(log[0].eventName).toBe("test:log");
    expect(log[0].id).toBeDefined();
    expect(log[0].timestamp).toBeGreaterThan(0);
  });

  it("clearLog empties the log", () => {
    globalEventBus.addLog({ eventName: "a", payload: null, severity: "info" });
    globalEventBus.clearLog();
    expect(globalEventBus.getLog()).toHaveLength(0);
  });

  it("truncates at maxLogSize", () => {
    for (let i = 0; i < 600; i++) {
      globalEventBus.addLog({ eventName: `e${i}`, payload: i, severity: "info" });
    }
    expect(globalEventBus.getLog().length).toBeLessThanOrEqual(500);
  });
});

describe("Recovery Queue", () => {
  it("queues and drains events", () => {
    globalEventBus.queueForRecovery("test:recover", "queued-data");
    expect(globalEventBus.getRecoveryQueueSize()).toBe(1);

    const listener = vi.fn();
    globalEventBus.on("test:recover", listener);
    globalEventBus.drainRecoveryQueue();
    expect(listener).toHaveBeenCalledWith("queued-data");
    expect(globalEventBus.getRecoveryQueueSize()).toBe(0);
  });

  it("drain with no listeners does not throw", () => {
    globalEventBus.queueForRecovery("test:drain", 1);
    expect(() => globalEventBus.drainRecoveryQueue()).not.toThrow();
  });
});

describe("EventChannels Constants", () => {
  it("defines all required channels", () => {
    const channels = [
      EventChannels.SCAN_PROGRESS,
      EventChannels.SCAN_COMPLETE,
      EventChannels.SCAN_ERROR,
      EventChannels.DUPLICATE_PROGRESS,
      EventChannels.DUPLICATE_COMPLETE,
      EventChannels.DUPLICATE_ERROR,
      EventChannels.MOVE_PROGRESS,
      EventChannels.MOVE_COMPLETE,
      EventChannels.MOVE_ERROR,
      EventChannels.CACHE_PROGRESS,
      EventChannels.CACHE_COMPLETE,
      EventChannels.HEALTH_PROGRESS,
      EventChannels.HEALTH_COMPLETE,
      EventChannels.ERROR_OCCURRED,
    ];
    for (const ch of channels) {
      expect(typeof ch).toBe("string");
      expect(ch.length).toBeGreaterThan(0);
    }
  });
});
