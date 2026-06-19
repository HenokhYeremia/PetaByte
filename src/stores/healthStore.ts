import { create } from "zustand";
import type {
  MockHealthScore,
  MockHealthFactor,
  MockHealthRecommendation,
  MockPotentialSavings,
  MockHealthTrend,
  MockHealthStatus,
} from "@/mocks/health";

interface HealthStore {
  score: MockHealthScore | null;
  factors: MockHealthFactor[];
  recommendations: MockHealthRecommendation[];
  savings: MockPotentialSavings | null;
  trend: MockHealthTrend | null;
  status: MockHealthStatus;
  loading: boolean;
  error: string | null;

  setScore: (score: MockHealthScore | null) => void;
  setFactors: (factors: MockHealthFactor[]) => void;
  setRecommendations: (recommendations: MockHealthRecommendation[]) => void;
  setSavings: (savings: MockPotentialSavings | null) => void;
  setTrend: (trend: MockHealthTrend | null) => void;
  setStatus: (status: MockHealthStatus) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  analyze: () => void;
  reset: () => void;
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

  analyze: () => set({ status: "analyzing", loading: true, error: null }),
  reset: () =>
    set({
      score: null,
      factors: [],
      recommendations: [],
      savings: null,
      trend: null,
      status: "idle",
      loading: false,
      error: null,
    }),
}));
