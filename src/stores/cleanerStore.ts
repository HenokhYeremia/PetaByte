import { create } from "zustand";
import type { CacheCategory, CacheSummary, CacheFilter, CleanupPreview, CacheStatus } from "@/types";
import { scanCacheTauri, cleanCacheTauri, computePreview } from "@/bridge";

interface CleanerStore {
  categories: CacheCategory[];
  summary: CacheSummary | null;
  preview: CleanupPreview | null;
  status: CacheStatus;
  loading: boolean;
  error: string | null;
  selectedCategoryId: string | null;
  filter: CacheFilter;

  setCategories: (categories: CacheCategory[]) => void;
  setSummary: (summary: CacheSummary | null) => void;
  setPreview: (preview: CleanupPreview | null) => void;
  setStatus: (status: CacheStatus) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedCategoryId: (id: string | null) => void;
  setFilter: (filter: Partial<CacheFilter>) => void;
  selectAll: (selected: boolean) => void;
  toggleEntry: (entryId: string, selected: boolean) => void;
  previewCleanup: () => void;
  fetchCacheData: () => Promise<void>;
  startCleanupAction: () => Promise<void>;
}

const DEFAULT_FILTER: CacheFilter = { search: "", categoryFilter: "all", safetyFilter: "all" };

export const useCleanerStore = create<CleanerStore>((set, get) => ({
  categories: [],
  summary: null,
  preview: null,
  status: "idle",
  loading: false,
  error: null,
  selectedCategoryId: null,
  filter: DEFAULT_FILTER,

  setCategories: (categories) => set({ categories }),
  setSummary: (summary) => set({ summary }),
  setPreview: (preview) => set({ preview }),
  setStatus: (status) => set({ status }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setSelectedCategoryId: (id) => set({ selectedCategoryId: id }),
  setFilter: (filter) => set((s) => ({ filter: { ...s.filter, ...filter } })),

  selectAll: (selected) => set((s) => ({
    categories: s.categories.map((c) => ({
      ...c,
      entries: c.entries.map((e) => ({ ...e, selected })),
    })),
  })),

  toggleEntry: (entryId, selected) => set((s) => ({
    categories: s.categories.map((c) => ({
      ...c,
      entries: c.entries.map((e) => e.id === entryId ? { ...e, selected } : e),
    })),
  })),

  previewCleanup: () => {
    const preview = computePreview(get().categories);
    set({ preview, status: "previewing" });
  },

  fetchCacheData: async () => {
    set({ loading: true, error: null });
    try {
      const result = await scanCacheTauri();
      set({ categories: result.categories, summary: result.summary, loading: false, status: "ready" });
    } catch (err) {
      set({ loading: false, error: String(err) });
    }
  },

  startCleanupAction: async () => {
    set({ status: "cleaning", error: null });
    try {
      await cleanCacheTauri();
      set({ status: "completed" });
    } catch (err) {
      set({ status: "failed", error: String(err) });
    }
  },
}));
