import { create } from "zustand";
import type { CacheCategory } from "@/types";

interface CleanerStore {
  categories: CacheCategory[];
  total_size: number;
  loading: boolean;
  setCategories: (categories: CacheCategory[]) => void;
  setLoading: (loading: boolean) => void;
}

export const useCleanerStore = create<CleanerStore>((set) => ({
  categories: [],
  total_size: 0,
  loading: false,
  setCategories: (categories) =>
    set({
      categories,
      total_size: categories.reduce((s, c) => s + c.total_size, 0),
      loading: false,
    }),
  setLoading: (loading) => set({ loading }),
}));
