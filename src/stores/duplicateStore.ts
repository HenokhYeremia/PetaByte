import { create } from "zustand";
import type {
  DuplicateGroup, DuplicateSummary, DuplicateFilterState, DuplicateSortConfig,
} from "@/types";
import { fetchDuplicates } from "@/bridge";

interface DuplicateStore {
  groups: DuplicateGroup[];
  summary: DuplicateSummary | null;
  loading: boolean;
  error: string | null;
  selectedGroupId: string | null;
  selectedFileIds: Set<string>;
  filterState: DuplicateFilterState;
  sortConfig: DuplicateSortConfig;

  setGroups: (groups: DuplicateGroup[]) => void;
  setSummary: (summary: DuplicateSummary | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedGroupId: (id: string | null) => void;
  setFilterState: (state: Partial<DuplicateFilterState>) => void;
  setSortConfig: (config: DuplicateSortConfig) => void;
  toggleFile: (groupId: string, fileId: string) => void;
  selectAllGroup: (groupId: string, select: boolean) => void;
  fetchDuplicatesAction: (sessionId?: string) => Promise<void>;
}

const DEFAULT_SORT_CONFIG: DuplicateSortConfig = { field: "size", direction: "desc" };
const DEFAULT_FILTER_STATE: DuplicateFilterState = { search: "", folder: "", extensions: [], countMin: null, countMax: null, sizeMin: null, sizeMax: null, extensionFilter: "all", sortConfig: DEFAULT_SORT_CONFIG };

export const useDuplicateStore = create<DuplicateStore>((set, get) => ({
  groups: [],
  summary: null,
  loading: false,
  error: null,
  selectedGroupId: null,
  selectedFileIds: new Set(),
  filterState: DEFAULT_FILTER_STATE,
  sortConfig: DEFAULT_SORT_CONFIG,

  setGroups: (groups) => set({ groups }),
  setSummary: (summary) => set({ summary }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setSelectedGroupId: (id) => set({ selectedGroupId: id }),
  setFilterState: (state) => set((s) => ({ filterState: { ...s.filterState, ...state } })),
  setSortConfig: (config) => set({ sortConfig: config, filterState: { ...get().filterState, sortConfig: config } }),

  toggleFile: (_groupId, fileId) => set((s) => {
    const next = new Set(s.selectedFileIds);
    if (next.has(fileId)) next.delete(fileId); else next.add(fileId);
    return { selectedFileIds: next };
  }),

  selectAllGroup: (groupId, select) => set((s) => {
    const group = s.groups.find((g) => g.id === groupId);
    if (!group) return {};
    const next = new Set(s.selectedFileIds);
    for (const f of group.files) {
      if (select) next.add(f.id); else next.delete(f.id);
    }
    return { selectedFileIds: next };
  }),

  fetchDuplicatesAction: async () => {
    set({ loading: true, error: null });
    try {
      const result = await fetchDuplicates();
      set({ groups: result.groups, summary: result.summary, loading: false });
    } catch (err) {
      set({ loading: false, error: String(err) });
    }
  },
}));
