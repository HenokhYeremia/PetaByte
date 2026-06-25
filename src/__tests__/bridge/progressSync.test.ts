import { describe, it, expect, vi } from "vitest";
import { globalEventBus, EventChannels } from "@/bridge/eventBus";

describe("Progress Synchronization", () => {
  it("scan progress events flow through bus", () => {
    const spy = vi.fn();
    globalEventBus.on(EventChannels.SCAN_PROGRESS, spy);

    globalEventBus.emit(EventChannels.SCAN_PROGRESS, {
      session_id: "s1",
      scanned_files: 100,
      total_files: 1000,
      scanned_size: 5000,
      total_size: 50000,
      current_path: "/test",
      elapsed_secs: 5,
      eta_secs: 45,
      status: "scanning",
      total_directories: 10,
      speed_files_per_sec: 20,
      errors: 0,
    });

    expect(spy).toHaveBeenCalledTimes(1);
    const payload = spy.mock.calls[0][0];
    expect(payload.session_id).toBe("s1");
    expect(payload.scanned_files).toBe(100);
    expect(payload.status).toBe("scanning");
  });

  it("duplicate progress events flow through bus", () => {
    const spy = vi.fn();
    globalEventBus.on(EventChannels.DUPLICATE_PROGRESS, spy);

    globalEventBus.emit(EventChannels.DUPLICATE_PROGRESS, {
      groups_found: 5,
      files_analyzed: 500,
      current_stage: "full_hash",
      percentage: 65.0,
    });

    expect(spy).toHaveBeenCalledTimes(1);
    const p = spy.mock.calls[0][0];
    expect(p.groups_found).toBe(5);
    expect(p.current_stage).toBe("full_hash");
    expect(p.percentage).toBe(65.0);
  });

  it("duplicate complete event carries summary", () => {
    const spy = vi.fn();
    globalEventBus.on(EventChannels.DUPLICATE_COMPLETE, spy);

    globalEventBus.emit(EventChannels.DUPLICATE_COMPLETE, {
      groups_found: 10,
      total_wasted_bytes: 1_500_000_000,
    });

    expect(spy).toHaveBeenCalledWith({
      groups_found: 10,
      total_wasted_bytes: 1_500_000_000,
    });
  });

  it("move progress events flow through bus", () => {
    const spy = vi.fn();
    globalEventBus.on(EventChannels.MOVE_PROGRESS, spy);

    globalEventBus.emit(EventChannels.MOVE_PROGRESS, {
      current_file: "/src/file.txt",
      bytes_copied: 5000,
      total_bytes: 10000,
      files_completed: 2,
      total_files: 5,
      phase: "copying",
      percentage: 50,
      moved_files: 2,
      moved_bytes: 5000,
      elapsed_secs: 3,
      eta_secs: 3,
    });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0].percentage).toBe(50);
  });

  it("cache progress events flow through bus", () => {
    const spy = vi.fn();
    globalEventBus.on(EventChannels.CACHE_PROGRESS, spy);

    globalEventBus.emit(EventChannels.CACHE_PROGRESS, {
      items_processed: 25,
      space_recovered: 1_000_000,
      status: "cleaning",
      total_items: 100,
    });

    expect(spy).toHaveBeenCalledTimes(1);
    const p = spy.mock.calls[0][0];
    expect(p.items_processed).toBe(25);
    expect(p.space_recovered).toBe(1_000_000);
  });

  it("health progress events flow through bus", () => {
    const spy = vi.fn();
    globalEventBus.on(EventChannels.HEALTH_PROGRESS, spy);

    globalEventBus.emit(EventChannels.HEALTH_PROGRESS, {
      analysis_progress: 0.75,
      factor_evaluation_progress: 0.5,
      current_factor: "Free Space",
    });

    expect(spy).toHaveBeenCalledTimes(1);
    const p = spy.mock.calls[0][0];
    expect(p.analysis_progress).toBe(0.75);
    expect(p.current_factor).toBe("Free Space");
  });

  it("health complete event carries score", () => {
    const spy = vi.fn();
    globalEventBus.on(EventChannels.HEALTH_COMPLETE, spy);

    globalEventBus.emit(EventChannels.HEALTH_COMPLETE, {
      overall_score: 85,
      grade: "B",
    });

    expect(spy).toHaveBeenCalledWith({ overall_score: 85, grade: "B" });
  });

  it("error events carry source and severity", () => {
    const spy = vi.fn();
    globalEventBus.on(EventChannels.ERROR_OCCURRED, spy);

    globalEventBus.emit(EventChannels.ERROR_OCCURRED, {
      source: "scanner",
      message: "Permission denied",
      severity: "error",
    });

    expect(spy).toHaveBeenCalledTimes(1);
    const e = spy.mock.calls[0][0];
    expect(e.source).toBe("scanner");
    expect(e.severity).toBe("error");
  });

  it("last payload available after emit", () => {
    globalEventBus.emit(EventChannels.SCAN_PROGRESS, {
      session_id: "s2",
      status: "completed",
    });
    const last = globalEventBus.getLastPayload(EventChannels.SCAN_PROGRESS);
    expect(last).toEqual({ session_id: "s2", status: "completed" });
  });

  it("scan complete event passes through bus", () => {
    const spy = vi.fn();
    globalEventBus.on(EventChannels.SCAN_COMPLETE, spy);

    globalEventBus.emit(EventChannels.SCAN_COMPLETE, {
      id: "scan-1",
      volume_id: "vol-c",
      status: "completed",
      total_files: 1000,
      total_dirs: 50,
      total_size: 5000000,
      scanned_files: 1000,
      scanned_size: 5000000,
      errors_count: 0,
      duration_secs: 12,
      started_at: "2026-06-20T10:00:00Z",
      completed_at: "2026-06-20T10:00:12Z",
      path: "C:\\",
      total_directories: 50,
      errors: 0,
    });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0].id).toBe("scan-1");
  });
});
