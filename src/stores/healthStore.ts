import { create } from "zustand";
import type { HealthScore } from "@/types";

interface HealthStore {
  score: HealthScore | null;
  loading: boolean;
  setScore: (score: HealthScore) => void;
  setLoading: (loading: boolean) => void;
}

export const useHealthStore = create<HealthStore>((set) => ({
  score: null,
  loading: false,
  setScore: (score) => set({ score, loading: false }),
  setLoading: (loading) => set({ loading }),
}));
