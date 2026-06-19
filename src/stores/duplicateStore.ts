import { create } from "zustand";
import type { MockDuplicateGroup, MockDuplicateSummary, MockFilterState, MockSortConfig } from "@/mocks/duplicates";
import { defaultFilterState, defaultSortConfig } from "@/mocks/duplicates";

interface DuplicateStore {
  groups: MockDuplicateGroup[];
  summary: MockDuplicateSummary | null;
  loading: boolean;

  selectedGroupId: string | null;
  selectedFileIds: Set<string>;

  filter: MockFilterState;
  sortConfig: MockSortConfig;

  setGroups: (groups: MockDuplicateGroup[]) => void;
  setSummary: (summary: MockDuplicateSummary | null) => void;
  setLoading: (loading: boolean) => void;

  selectGroup: (id: string | null) => void;
  toggleFile: (groupId: string, fileId: string) => void;
  toggleGroup: (groupId: string, select: boolean) => void;
  selectAllFiles: (select: boolean) => void;

  updateFilter: (partial: Partial<MockFilterState>) => void;
  setSortField: (field: MockSortConfig["field"]) => void;
  toggleSortDirection: () => void;

  previewMove: () => void;
  previewDelete: () => void;
  smartMove: () => void;
  exportReport: () => void;
}

export const useDuplicateStore = create<DuplicateStore>((set) => ({
  groups: [],
  summary: null,
  loading: false,

  selectedGroupId: null,
  selectedFileIds: new Set<string>(),

  filter: defaultFilterState,
  sortConfig: defaultSortConfig,

  setGroups: (groups) => set({ groups, loading: false }),
  setSummary: (summary) => set({ summary }),
  setLoading: (loading) => set({ loading }),

  selectGroup: (id) => set({ selectedGroupId: id }),

  toggleFile: (_groupId, fileId) =>
    set((s) => {
      const next = new Set(s.selectedFileIds);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return { selectedFileIds: next };
    }),

  toggleGroup: (groupId, select) =>
    set((s) => {
      const group = s.groups.find((g) => g.id === groupId);
      if (!group) return {};
      const next = new Set(s.selectedFileIds);
      for (const f of group.files) {
        if (select) next.add(f.id);
        else next.delete(f.id);
      }
      return { selectedFileIds: next };
    }),

  selectAllFiles: (select) =>
    set((s) => {
      const next = new Set<string>();
      if (select) {
        for (const g of s.groups) {
          for (const f of g.files) {
            next.add(f.id);
          }
        }
      }
      return { selectedFileIds: next };
    }),

  updateFilter: (partial) =>
    set((s) => ({ filter: { ...s.filter, ...partial } })),

  setSortField: (field) =>
    set((s) => ({ sortConfig: { field, direction: s.sortConfig.direction } })),

  toggleSortDirection: () =>
    set((s) => ({
      sortConfig: {
        ...s.sortConfig,
        direction: s.sortConfig.direction === "desc" ? "asc" : "desc",
      },
    })),

  previewMove: () => {},
  previewDelete: () => {},
  smartMove: () => {},
  exportReport: () => {},
}));
