import { create } from "zustand";
import type { MockCacheCategory, MockCacheSummary, MockCacheFilter, MockCleanupPreview, MockCacheStatus } from "@/mocks/cache";
import { defaultCacheFilter } from "@/mocks/cache";

interface CleanerStore {
  categories: MockCacheCategory[];
  summary: MockCacheSummary | null;
  filter: MockCacheFilter;
  preview: MockCleanupPreview | null;
  status: MockCacheStatus;
  loading: boolean;

  setCategories: (categories: MockCacheCategory[]) => void;
  setSummary: (summary: MockCacheSummary | null) => void;
  updateFilter: (partial: Partial<MockCacheFilter>) => void;
  setPreview: (preview: MockCleanupPreview | null) => void;
  setStatus: (status: MockCacheStatus) => void;
  setLoading: (loading: boolean) => void;

  selectAll: (selected: boolean) => void;
  selectCategory: (categoryId: string, selected: boolean) => void;
  selectEntry: (entryId: string, selected: boolean) => void;
  analyze: () => void;
  previewCleanup: () => void;
  startCleanup: () => void;
  cancelCleanup: () => void;
}

function recalcTotal(categories: MockCacheCategory[]): number {
  return categories.reduce((s, c) => s + c.total_size, 0);
}

export const useCleanerStore = create<CleanerStore>((set, get) => ({
  categories: [],
  summary: null,
  filter: defaultCacheFilter,
  preview: null,
  status: "idle",
  loading: false,

  setCategories: (categories) => {
    const total = recalcTotal(categories);
    set({
      categories,
      loading: false,
    });
    const s = get().summary;
    if (s) {
      set({ summary: { ...s, total_cache_size: total } });
    }
  },

  setSummary: (summary) => set({ summary }),
  updateFilter: (partial) => set((s) => ({ filter: { ...s.filter, ...partial } })),

  setPreview: (preview) => set({ preview }),

  setStatus: (status) => set({ status }),
  setLoading: (loading) => set({ loading }),

  selectAll: (selected) =>
    set((s) => ({
      categories: s.categories.map((cat) => ({
        ...cat,
        entries: cat.entries.map((e) => ({ ...e, selected })),
      })),
      preview: null,
    })),

  selectCategory: (categoryId, selected) =>
    set((s) => ({
      categories: s.categories.map((cat) =>
        cat.id === categoryId
          ? { ...cat, entries: cat.entries.map((e) => ({ ...e, selected })) }
          : cat,
      ),
      preview: null,
    })),

  selectEntry: (entryId, selected) =>
    set((s) => ({
      categories: s.categories.map((cat) => ({
        ...cat,
        entries: cat.entries.map((e) => (e.id === entryId ? { ...e, selected } : e)),
      })),
      preview: null,
    })),

  analyze: () => set({ status: "analyzing", loading: true }),
  previewCleanup: () => set({ status: "previewing" }),
  startCleanup: () => set({ status: "cleaning" }),
  cancelCleanup: () => set({ status: "cancelled" }),
}));
