import { create } from "zustand";
import type { ScanSession, ScanProgress } from "@/types";

interface ScanStore {
  session: ScanSession | null;
  progress: ScanProgress | null;
  history: ScanSession[];
  setSession: (session: ScanSession | null) => void;
  setProgress: (progress: ScanProgress | null) => void;
  setHistory: (history: ScanSession[]) => void;
}

export const useScanStore = create<ScanStore>((set) => ({
  session: null,
  progress: null,
  history: [],
  setSession: (session) => set({ session }),
  setProgress: (progress) => set({ progress }),
  setHistory: (history) => set({ history }),
}));
