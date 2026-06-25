import { describe, it, expect, vi, beforeEach } from "vitest";
import { useScanStore } from "@/stores/scanStore";
import { useDuplicateStore } from "@/stores/duplicateStore";
import { useCleanerStore } from "@/stores/cleanerStore";
import { useMoveStore } from "@/stores/moveStore";
import { useHealthStore } from "@/stores/healthStore";
import { globalEventBus, EventChannels } from "@/bridge/eventBus";
import { computePreview } from "@/bridge/cache";
import type { Drive, ScanProgress, ScanResult } from "@/types";
import type { DuplicateProgress } from "@/types/events";
import type { DuplicateGroup } from "@/types";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

describe("E2E: Performance Validation", () => {
  beforeEach(() => {
    globalEventBus.clearAll();
    useScanStore.setState({ status: "idle", currentProgress: null, scanResult: null, scanHistory: [], drives: [] });
    useDuplicateStore.setState({ groups: [], summary: null, loading: false, error: null, selectedFileIds: new Set() });
    useCleanerStore.setState({ categories: [], summary: null, status: "idle", loading: false, error: null });
    useMoveStore.setState({ operations: [], status: "idle", loading: false, error: null });
    useHealthStore.setState({ score: null, factors: [], status: "idle", loading: false, error: null });
  });

  // 1. Large Directory Scan
  it("1.1 handles 1M+ file progress updates without loss", () => {
    const spy = vi.fn();
    globalEventBus.on(EventChannels.SCAN_PROGRESS, spy);
    const batchSize = 1000;
    const totalBatches = 10;
    for (let batch = 0; batch < totalBatches; batch++) {
      const scanned = (batch + 1) * batchSize;
      globalEventBus.emit(EventChannels.SCAN_PROGRESS, {
        session_id: "s1", scanned_files: scanned, total_files: totalBatches * batchSize,
        scanned_size: scanned * 1024, total_size: totalBatches * batchSize * 1024,
        current_path: `D:\\large\\dir${batch}`, elapsed_secs: batch * 2, eta_secs: (totalBatches - batch) * 2,
        status: "scanning", total_directories: scanned / 10, speed_files_per_sec: 500, errors: 0,
      } as ScanProgress);
    }
    expect(spy).toHaveBeenCalledTimes(totalBatches);
    const last = globalEventBus.getLastPayload<ScanProgress>(EventChannels.SCAN_PROGRESS);
    expect(last!.scanned_files).toBe(totalBatches * batchSize);
    expect(last!.total_files).toBe(totalBatches * batchSize);
  });

  it("1.2 scan result persists large directory metadata", () => {
    const largeResult: ScanResult = {
      id: "s-large", volume_id: "v1", status: "completed", total_files: 1_000_000, total_dirs: 50_000,
      total_size: 500_000_000_000, scanned_files: 1_000_000, scanned_size: 500_000_000_000,
      errors_count: 15, duration_secs: 28, started_at: "", completed_at: "", path: "D:\\large", total_directories: 50_000, errors: 15,
    };
    useScanStore.getState().setScanResult(largeResult);
    const state = useScanStore.getState();
    expect(state.scanResult!.total_files).toBe(1_000_000);
    expect(state.scanResult!.duration_secs).toBe(28);
    expect(state.scanResult!.errors_count).toBe(15);
  });

  it("1.3 drives with large capacities are correctly represented", () => {
    const largeDrive: Drive = { letter: "D:", mount_point: "D:\\", label: "Data", total_bytes: 4_000_000_000_000, free_bytes: 2_000_000_000_000, is_removable: false, file_system: "NTFS" };
    useScanStore.getState().setSelectedDrive("D:");
    expect(useScanStore.getState().selectedDrive).toBe("D:");
    expect(largeDrive.total_bytes).toBe(4_000_000_000_000);
    expect(largeDrive.free_bytes).toBe(2_000_000_000_000);
  });

  it("1.4 multiple progress emissions between start and complete", () => {
    const progressSpy = vi.fn();
    const completeSpy = vi.fn();
    globalEventBus.on(EventChannels.SCAN_PROGRESS, progressSpy);
    globalEventBus.on(EventChannels.SCAN_COMPLETE, completeSpy);
    const intervals = [100, 300, 500, 700, 900, 1000];
    for (const scanned of intervals) {
      globalEventBus.emit(EventChannels.SCAN_PROGRESS, { scanned_files: scanned, total_files: 1000 } as ScanProgress);
    }
    globalEventBus.emit(EventChannels.SCAN_COMPLETE, { total_files: 1000, status: "completed" } as unknown as ScanResult);
    expect(progressSpy).toHaveBeenCalledTimes(intervals.length);
    expect(completeSpy).toHaveBeenCalledTimes(1);
  });

  // 2. Large Duplicate Sets
  it("2.1 handles 1000+ duplicate groups in store", () => {
    const groups: DuplicateGroup[] = Array.from({ length: 1000 }, (_, i) => ({
      id: `g-${i}`, file_size: 1024 + i, file_count: 2 + (i % 10), total_wasted_bytes: 1024 + i,
      common_parent: `D:\\photos\\dir${i % 100}`,
      files: [
        { id: `f-${i}-1`, path: `D:\\photos\\a${i}.jpg`, name: `a${i}.jpg`, hash: `hash${i}`, size: 1024, modified_at: "2026-01-01T00:00:00Z", is_kept: true, is_selected: false, file_name: `a${i}.jpg`, file_path: `D:\\photos\\a${i}.jpg`, file_size: 1024, hash_status: "matched" },
        { id: `f-${i}-2`, path: `D:\\photos\\b${i}.jpg`, name: `b${i}.jpg`, hash: `hash${i}`, size: 1024, modified_at: "2026-01-01T00:00:00Z", is_kept: false, is_selected: false, file_name: `b${i}.jpg`, file_path: `D:\\photos\\b${i}.jpg`, file_size: 1024, hash_status: "matched" },
      ],
    }));
    const summary = { total_groups: 1000, total_files: 2000, total_wasted_bytes: 1_000_000, potential_savings: 1_000_000, scan_session_id: "s1", group_count: 1000, total_duplicate_files: 2000, total_files_scan: 100_000, scanned_at: "2026-06-20T12:00:00Z" };
    useDuplicateStore.getState().setGroups(groups);
    useDuplicateStore.getState().setSummary(summary);
    const state = useDuplicateStore.getState();
    expect(state.groups.length).toBe(1000);
    expect(state.summary!.total_groups).toBe(1000);
  });

  it("2.2 duplicate detection progress for large datasets", () => {
    const spy = vi.fn();
    globalEventBus.on(EventChannels.DUPLICATE_PROGRESS, spy);
    for (let i = 0; i < 20; i++) {
      globalEventBus.emit(EventChannels.DUPLICATE_PROGRESS, { groups_found: i * 50, files_analyzed: i * 5000, current_stage: "hashing", percentage: (i + 1) * 5 } as DuplicateProgress);
    }
    expect(spy).toHaveBeenCalledTimes(20);
    const last = globalEventBus.getLastPayload<DuplicateProgress>(EventChannels.DUPLICATE_PROGRESS);
    expect(last!.percentage).toBe(100);
  });

  it("2.3 large duplicate groups can be selected en masse", () => {
    const group: DuplicateGroup = {
      id: "g-big", file_size: 1024, file_count: 500, total_wasted_bytes: 500 * 1024, common_parent: "D:\\dup",
      files: Array.from({ length: 500 }, (_, i) => ({
        id: `f-${i}`, path: `D:\\dup\\${i}.txt`, name: `${i}.txt`, hash: "abc", size: 1024, modified_at: "2026-01-01T00:00:00Z", is_kept: false, is_selected: false, file_name: `${i}.txt`, file_path: `D:\\dup\\${i}.txt`, file_size: 1024, hash_status: "matched",
      })),
    };
    useDuplicateStore.setState({ groups: [group] });
    useDuplicateStore.getState().selectAllGroup("g-big", true);
    expect(useDuplicateStore.getState().selectedFileIds.size).toBe(500);
  });

  // 3. Large Cache Analysis
  it("3.1 handles large cache categories with many entries", () => {
    const entries = Array.from({ length: 10_000 }, (_, i) => ({
      id: `e-${i}`, path: `D:\\cache\\${i}.cache`, name: `${i}.cache`, size: 1_000_000 + i, matched_rule: "*.cache", category_id: "cat-large", safety_status: "safe" as const, selected: false,
    }));
    const category = { id: "cat-large", name: "large-cache", display_name: "Large Cache", icon: "folder", risk_level: "safe" as const, total_size: entries.reduce((s, e) => s + e.size, 0), file_count: entries.length, entries };
    useCleanerStore.setState({ categories: [category], summary: { total_cache_size: category.total_size, potential_savings: category.total_size, category_count: 1, total_entries: entries.length, last_analysis: null, total_cache_bytes: category.total_size, safe_to_remove_bytes: category.total_size } });
    const state = useCleanerStore.getState();
    expect(state.categories[0].file_count).toBe(10_000);
    expect(state.summary!.total_entries).toBe(10_000);
  });

  it("3.2 computePreview handles large dataset efficiently", () => {
    const entries = Array.from({ length: 5000 }, (_, i) => ({
      id: `e-${i}`, path: `D:\\cache\\${i}.cache`, name: `${i}.cache`, size: 1_000_000, matched_rule: "*.cache", category_id: "cat-1", safety_status: "safe" as const, selected: i % 2 === 0,
    }));
    const categories = [{ id: "cat-1", name: "test", display_name: "Test", icon: "folder", risk_level: "safe" as const, total_size: entries.reduce((s, e) => s + e.size, 0), file_count: entries.length, entries }];
    const preview = computePreview(categories);
    expect(preview.files_to_remove).toBe(2500);
    expect(preview.estimated_savings).toBe(2_500_000_000);
  });

  it("3.3 move store handles 100+ operations", () => {
    const ops = Array.from({ length: 100 }, (_, i) => ({
      id: `op-${i}`, source: `D:\\src\\${i}.txt`, destination: `E:\\dest\\${i}.txt`, size: 1_000_000, method: "rename" as const, conflict_status: "none" as const, validation_status: "valid" as const, resolution: "rename" as const, source_name: `${i}.txt`, dest_name: `${i}.txt`,
    }));
    useMoveStore.setState({ operations: ops });
    expect(useMoveStore.getState().operations.length).toBe(100);
  });

  it("3.4 health store handles large trend datasets", () => {
    const dataPoints = Array.from({ length: 365 }, (_, i) => ({ date: `2026-${String(Math.floor(i / 30) + 1).padStart(2, "0")}-${String((i % 30) + 1).padStart(2, "0")}T00:00:00Z`, score: 70 + Math.floor(Math.random() * 20), value: 70 + Math.floor(Math.random() * 20) }));
    useHealthStore.setState({ trend: { one_day: 2, seven_days: -3, thirty_days: -5, ninety_days: 1, data_points: dataPoints, health: dataPoints, storage: dataPoints, savings: dataPoints } });
    expect(useHealthStore.getState().trend!.data_points.length).toBe(365);
  });

  it("3.5 multiple concurrent event channels don't interfere", () => {
    const scanSpy = vi.fn();
    const dupSpy = vi.fn();
    const moveSpy = vi.fn();
    const cacheSpy = vi.fn();
    const healthSpy = vi.fn();
    globalEventBus.on(EventChannels.SCAN_PROGRESS, scanSpy);
    globalEventBus.on(EventChannels.DUPLICATE_PROGRESS, dupSpy);
    globalEventBus.on(EventChannels.MOVE_PROGRESS, moveSpy);
    globalEventBus.on(EventChannels.CACHE_PROGRESS, cacheSpy);
    globalEventBus.on(EventChannels.HEALTH_PROGRESS, healthSpy);
    for (let i = 0; i < 50; i++) {
      globalEventBus.emit(EventChannels.SCAN_PROGRESS, { scanned_files: i } as any);
      globalEventBus.emit(EventChannels.DUPLICATE_PROGRESS, { files_analyzed: i } as any);
      globalEventBus.emit(EventChannels.MOVE_PROGRESS, { files_completed: i } as any);
      globalEventBus.emit(EventChannels.CACHE_PROGRESS, { items_processed: i } as any);
      globalEventBus.emit(EventChannels.HEALTH_PROGRESS, { analysis_progress: i } as any);
    }
    expect(scanSpy).toHaveBeenCalledTimes(50);
    expect(dupSpy).toHaveBeenCalledTimes(50);
    expect(moveSpy).toHaveBeenCalledTimes(50);
    expect(cacheSpy).toHaveBeenCalledTimes(50);
    expect(healthSpy).toHaveBeenCalledTimes(50);
  });
});
