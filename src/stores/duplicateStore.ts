import { create } from "zustand";
import type { DuplicateGroup } from "@/types";

interface DuplicateStore {
  groups: DuplicateGroup[];
  total_wasted_bytes: number;
  loading: boolean;
  setGroups: (groups: DuplicateGroup[]) => void;
  setLoading: (loading: boolean) => void;
}

export const useDuplicateStore = create<DuplicateStore>((set) => ({
  groups: [],
  total_wasted_bytes: 0,
  loading: false,
  setGroups: (groups) =>
    set({
      groups,
      total_wasted_bytes: groups.reduce((s, g) => s + g.total_wasted_bytes, 0),
      loading: false,
    }),
  setLoading: (loading) => set({ loading }),
}));
