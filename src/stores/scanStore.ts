import { create } from "zustand";
import type { ScanSession, ScanProgress } from "@/types";
import type { MockDrive, MockIgnoreRule, MockScanConfig, MockScanResult, MockHistoryItem } from "@/mocks/scanner";
import { mockDrives, mockIgnoreRules, defaultScanConfig } from "@/mocks/scanner";

type ScanStatus = "idle" | "scanning" | "paused" | "completed" | "cancelled" | "failed";

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
  drives: MockDrive[];
  ignoreRules: MockIgnoreRule[];
  scanConfig: MockScanConfig;
  status: ScanStatus;
  currentProgress: import("@/mocks/scanner").MockScanProgress | null;
  scanResult: MockScanResult | null;
  scanHistory: MockHistoryItem[];
  selectedHistoryId: string | null;

  setSelectedDrive: (drive: string | null) => void;
  setSelectedPath: (path: string) => void;
  setPathError: (error: string | null) => void;
  setScanConfig: (config: Partial<MockScanConfig>) => void;
  toggleIgnoreRule: (id: string) => void;
  setStatus: (status: ScanStatus) => void;
  setCurrentProgress: (progress: import("@/mocks/scanner").MockScanProgress | null) => void;
  setScanResult: (result: MockScanResult | null) => void;
  setScanHistory: (history: MockHistoryItem[]) => void;
  setSelectedHistoryId: (id: string | null) => void;
}

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
  drives: mockDrives,
  ignoreRules: mockIgnoreRules,
  scanConfig: defaultScanConfig,
  status: "idle",
  currentProgress: null,
  scanResult: null,
  scanHistory: [],
  selectedHistoryId: null,

  setSelectedDrive: (drive) => set({ selectedDrive: drive, selectedPath: drive || "" }),
  setSelectedPath: (path) => set({ selectedPath: path, pathError: null }),
  setPathError: (error) => set({ pathError: error }),
  setScanConfig: (config) => set((s) => ({ scanConfig: { ...s.scanConfig, ...config } })),
  toggleIgnoreRule: (id) => set((s) => ({
    ignoreRules: s.ignoreRules.map((r) =>
      r.id === id ? { ...r, enabled: !r.enabled } : r,
    ),
  })),
  setStatus: (status) => set({ status }),
  setCurrentProgress: (progress) => set({ currentProgress: progress }),
  setScanResult: (result) => set({ scanResult: result }),
  setScanHistory: (history) => set({ scanHistory: history }),
  setSelectedHistoryId: (id) => set({ selectedHistoryId: id }),
}));
