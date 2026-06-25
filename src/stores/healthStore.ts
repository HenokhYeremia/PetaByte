import { create } from "zustand";
import type { HealthScore, HealthFactor, HealthRecommendation, PotentialSavings, HealthTrend, HealthStatus } from "@/types";
import { fetchHealthScore } from "@/bridge";

interface HealthStore {
  score: HealthScore | null;
  factors: HealthFactor[];
  recommendations: HealthRecommendation[];
  savings: PotentialSavings | null;
  trend: HealthTrend | null;
  status: HealthStatus;
  loading: boolean;
  error: string | null;

  setScore: (score: HealthScore | null) => void;
  setFactors: (factors: HealthFactor[]) => void;
  setRecommendations: (recommendations: HealthRecommendation[]) => void;
  setSavings: (savings: PotentialSavings | null) => void;
  setTrend: (trend: HealthTrend | null) => void;
  setStatus: (status: HealthStatus) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
  fetchHealthData: (volumeId?: string) => Promise<void>;
}

export const useHealthStore = create<HealthStore>((set) => ({
  score: null,
  factors: [],
  recommendations: [],
  savings: null,
  trend: null,
  status: "idle",
  loading: false,
  error: null,

  setScore: (score) => set({ score }),
  setFactors: (factors) => set({ factors }),
  setRecommendations: (recommendations) => set({ recommendations }),
  setSavings: (savings) => set({ savings }),
  setTrend: (trend) => set({ trend }),
  setStatus: (status) => set({ status }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  reset: () => set({
    score: null, factors: [], recommendations: [], savings: null, trend: null, status: "idle", error: null,
  }),

  fetchHealthData: async () => {
    set({ loading: true, error: null });
    try {
      const result = await fetchHealthScore();
      set({
        score: result.score, factors: result.factors, recommendations: result.recommendations,
        savings: result.savings, trend: result.trend, status: "ready", loading: false,
      });
    } catch (err) {
      set({ loading: false, error: String(err) });
    }
  },
}));
