import { create } from "zustand";
import type { ScanSession, ScanProgress } from "@/types";
import type {
  Drive, IgnoreRule, ScanConfig, ScanResult, HistoryItem, ScanStatus,
} from "@/types";
import { fetchDrives, startScanTauri, cancelScanTauri } from "@/bridge";

interface ScanStore {
  session: ScanSession | null;
  progress: ScanProgress | null;
  history: ScanSession[];
  setSession: (session: ScanSession | null) => void;
  setProgress: (progress: ScanProgress | null) => void;
  setHistory: (history: ScanSession[]) => void;

  selectedDrive: string | null;
  selectedPath: string;
  pathError: string | null;
  drives: Drive[];
  ignoreRules: IgnoreRule[];
  scanConfig: ScanConfig;
  status: ScanStatus;
  currentProgress: ScanProgress | null;
  scanResult: ScanResult | null;
  scanHistory: HistoryItem[];
  selectedHistoryId: string | null;
  error: string | null;

  setSelectedDrive: (drive: string | null) => void;
  setSelectedPath: (path: string) => void;
  setPathError: (error: string | null) => void;
  setScanConfig: (config: Partial<ScanConfig>) => void;
  toggleIgnoreRule: (id: string) => void;
  setStatus: (status: ScanStatus) => void;
  setCurrentProgress: (progress: ScanProgress | null) => void;
  setScanResult: (result: ScanResult | null) => void;
  setScanHistory: (history: HistoryItem[]) => void;
  setSelectedHistoryId: (id: string | null) => void;
  setError: (error: string | null) => void;

  fetchDrivesAction: () => Promise<void>;
  startScanAction: (path: string) => Promise<void>;
  cancelScanAction: () => Promise<void>;
}

const DEFAULT_SCAN_CONFIG: ScanConfig = {
  path: undefined,
  recursive: true,
  follow_symlinks: false,
  thread_count: 4,
  max_depth: null,
  min_file_size: null,
  max_file_size: null,
  exclude_system_dirs: true,
};

export const useScanStore = create<ScanStore>((set) => ({
  session: null,
  progress: null,
  history: [],
  setSession: (session) => set({ session }),
  setProgress: (progress) => set({ progress }),
  setHistory: (history) => set({ history }),

  selectedDrive: null,
  selectedPath: "",
  pathError: null,
  drives: [],
  ignoreRules: [],
  scanConfig: DEFAULT_SCAN_CONFIG,
  status: "idle",
  currentProgress: null,
  scanResult: null,
  scanHistory: [],
  selectedHistoryId: null,
  error: null,

  setSelectedDrive: (drive) => set({ selectedDrive: drive, selectedPath: drive || "" }),
  setSelectedPath: (path) => set({ selectedPath: path, pathError: null }),
  setPathError: (error) => set({ pathError: error }),
  setScanConfig: (config) => set((s) => ({ scanConfig: { ...s.scanConfig, ...config } })),
  toggleIgnoreRule: (id) => set((s) => ({
    ignoreRules: s.ignoreRules.map((r) => r.id === id ? { ...r, enabled: !r.enabled } : r),
  })),
  setStatus: (status) => set({ status }),
  setCurrentProgress: (progress) => set({ currentProgress: progress }),
  setScanResult: (result) => set({ scanResult: result }),
  setScanHistory: (history) => set({ scanHistory: history }),
  setSelectedHistoryId: (id) => set({ selectedHistoryId: id }),
  setError: (error) => set({ error }),

  fetchDrivesAction: async () => {
    set({ error: null });
    try {
      const drives = await fetchDrives();
      set({ drives });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  startScanAction: async (path) => {
    set({ status: "scanning", currentProgress: { session_id: "", scanned_files: 0, total_files: 0, scanned_size: 0, total_size: 0, current_path: path, elapsed_secs: 0, eta_secs: 0, status: "scanning", total_directories: 0, speed_files_per_sec: 0, errors: 0 }, error: null });
    try {
      const resultRaw = await startScanTauri(path);
      let result: Record<string, unknown> = {};
      if (typeof resultRaw === "string" && resultRaw.length > 0) {
        result = JSON.parse(resultRaw);
      } else if (resultRaw && typeof resultRaw === "object") {
        result = resultRaw as Record<string, unknown>;
      }
      set({
        status: "completed",
        currentProgress: null,
        scanResult: {
          id: (result.session_id as string) ?? path,
          volume_id: (result.session_id as string) ?? path,
          status: "completed",
          total_files: (result.total_files as number) ?? 0,
          total_size: (result.total_size as number) ?? 0,
          scanned_files: (result.total_files as number) ?? 0,
          scanned_size: (result.total_size as number) ?? 0,
          errors_count: (result.total_errors as number) ?? 0,
          duration_secs: Math.round(((result.elapsed_ms as number) ?? 0) / 1000),
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          path,
          total_directories: (result.total_dirs as number) ?? 0,
          total_dirs: (result.total_dirs as number) ?? 0,
          errors: (result.total_errors as number) ?? 0,
        },
      });
    } catch (err) {
      set({ status: "failed", error: String(err) });
    }
  },

  cancelScanAction: async () => {
    try {
      await cancelScanTauri();
      set({ status: "cancelled", currentProgress: null });
    } catch (err) {
      set({ error: String(err) });
    }
  },
}));
