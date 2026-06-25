import { describe, it, expect, vi } from "vitest";
import { globalEventBus } from "@/bridge/eventBus";

describe("Event Lifecycle", () => {
  it("subscribe → emit → unsubscribe → no emit", () => {
    const spy = vi.fn();
    const unsub = globalEventBus.on("lifecycle:test", spy);

    globalEventBus.emit("lifecycle:test", 1);
    expect(spy).toHaveBeenCalledTimes(1);

    unsub();
    globalEventBus.emit("lifecycle:test", 2);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("multiple subscriptions on same channel all fire and can individually unsubscribe", () => {
    const a = vi.fn();
    const b = vi.fn();
    const unsubA = globalEventBus.on("lifecycle:multi", a);
    globalEventBus.on("lifecycle:multi", b);

    globalEventBus.emit("lifecycle:multi", "first");
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);

    unsubA();
    globalEventBus.emit("lifecycle:multi", "second");
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(2);
  });

  it("once subscription auto-unsubscribes after first emit", () => {
    const spy = vi.fn();
    globalEventBus.once("lifecycle:once", spy);
    globalEventBus.emit("lifecycle:once", "hit");
    globalEventBus.emit("lifecycle:once", "miss");
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("emit to empty channel does not throw", () => {
    expect(() => globalEventBus.emit("lifecycle:empty", "data")).not.toThrow();
  });

  it("clearAll removes all subscriptions and state", () => {
    const spy = vi.fn();
    globalEventBus.on("lifecycle:clear", spy);
    globalEventBus.emit("lifecycle:clear", 1);
    globalEventBus.clearAll();
    expect(globalEventBus.getListenerCount("lifecycle:clear")).toBe(0);
    expect(globalEventBus.getLastPayload("lifecycle:clear")).toBeNull();
    expect(globalEventBus.getLog()).toHaveLength(0);
    globalEventBus.emit("lifecycle:clear", 2);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("last payload persists until overwritten or channel cleared", () => {
    globalEventBus.emit("lifecycle:persist", "original");
    expect(globalEventBus.getLastPayload("lifecycle:persist")).toBe("original");
    globalEventBus.emit("lifecycle:persist", "updated");
    expect(globalEventBus.getLastPayload("lifecycle:persist")).toBe("updated");
  });

  it("listener sees all emitted values in order", () => {
    const received: number[] = [];
    globalEventBus.on<number>("lifecycle:order", (v) => received.push(v));
    globalEventBus.emit("lifecycle:order", 1);
    globalEventBus.emit("lifecycle:order", 2);
    globalEventBus.emit("lifecycle:order", 3);
    expect(received).toEqual([1, 2, 3]);
  });
});
