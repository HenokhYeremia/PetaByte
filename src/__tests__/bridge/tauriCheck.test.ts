import { describe, it, expect, beforeEach } from "vitest";
import { isTauriAvailable, resetTauriCheck } from "@/bridge/tauriCheck";

describe("tauriCheck", () => {
  beforeEach(() => {
    delete (window as any).__TAURI__;
    delete (window as any).__TAURI_INTERNALS__;
    resetTauriCheck();
  });

  it("returns false when Tauri is not available", () => {
    expect(isTauriAvailable()).toBe(false);
  });

  it("returns true when __TAURI__ is set", () => {
    (window as any).__TAURI__ = {};
    expect(isTauriAvailable()).toBe(true);
  });

  it("returns true when __TAURI_INTERNALS__ is set", () => {
    (window as any).__TAURI_INTERNALS__ = {};
    expect(isTauriAvailable()).toBe(true);
  });

  it("caches the result after first call", () => {
    expect(isTauriAvailable()).toBe(false);
    (window as any).__TAURI__ = {};
    expect(isTauriAvailable()).toBe(false);
    resetTauriCheck();
    expect(isTauriAvailable()).toBe(true);
  });

  it("resetTauriCheck clears the cached result", () => {
    (window as any).__TAURI__ = {};
    expect(isTauriAvailable()).toBe(true);
    resetTauriCheck();
    delete (window as any).__TAURI__;
    expect(isTauriAvailable()).toBe(false);
  });
});
