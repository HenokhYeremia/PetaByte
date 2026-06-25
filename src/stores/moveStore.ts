import { create } from "zustand";
import type { MoveItem, SuggestedLocation, RecentDestination, MoveOperation, MoveProgress, UndoJournalEntry, MoveFilterState, Resolution, MoveResultDto } from "@/types";
import { moveFileDryRunTauri, moveFileTauri, undoMoveTauri, fetchMoveHistoryTauri } from "@/bridge";

function toMoveOperations(results: MoveResultDto[]): MoveOperation[] {
  return results.map((r) => ({
    id: r.operation_id,
    source: r.source_path,
    destination: r.destination_path,
    size: r.file_size,
    method: "rename" as const,
    conflict_status: (r.error ? "invalid_path" : "none") as MoveOperation["conflict_status"],
    validation_status: (r.error ? "invalid" : "valid") as MoveOperation["validation_status"],
    resolution: "rename" as MoveOperation["resolution"],
    source_name: r.source_path.split("\\").pop() ?? r.source_path,
    dest_name: r.destination_path.split("\\").pop() ?? r.destination_path,
  }));
}

interface MoveStore {
  selectedItems: MoveItem[];
  suggestedLocations: SuggestedLocation[];
  recentDestinations: RecentDestination[];
  operations: MoveOperation[];
  progress: MoveProgress | null;
  status: "idle" | "previewing" | "ready" | "moving" | "completed" | "failed";
  loading: boolean;
  error: string | null;
  destination: string;
  undoJournal: UndoJournalEntry[];
  filterState: MoveFilterState;

  setSelectedItems: (items: MoveItem[]) => void;
  setSuggestedLocations: (locations: SuggestedLocation[]) => void;
  setRecentDestinations: (destinations: RecentDestination[]) => void;
  setOperations: (operations: MoveOperation[]) => void;
  setProgress: (progress: MoveProgress | null) => void;
  setStatus: (status: MoveStore["status"]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setDestination: (dest: string) => void;
  setUndoJournal: (journal: UndoJournalEntry[]) => void;
  setFilterState: (state: Partial<MoveFilterState>) => void;
  toggleItem: (id: string) => void;
  setResolution: (operationId: string, resolution: Resolution) => void;
  fetchPreviewAction: (srcPaths: string[], dest: string) => Promise<void>;
  startMoveAction: (srcPaths: string[], dest: string) => Promise<void>;
  undoMoveAction: (operationId: string) => Promise<void>;
  fetchUndoJournalAction: () => Promise<void>;
}

const DEFAULT_FILTER: MoveFilterState = { search: "", statusFilter: "all", conflictFilter: "all", validationFilter: "all" };

export const useMoveStore = create<MoveStore>((set) => ({
  selectedItems: [],
  suggestedLocations: [],
  recentDestinations: [],
  operations: [],
  progress: null,
  status: "idle",
  loading: false,
  error: null,
  destination: "",
  undoJournal: [],
  filterState: DEFAULT_FILTER,

  setSelectedItems: (items) => set({ selectedItems: items }),
  setSuggestedLocations: (locations) => set({ suggestedLocations: locations }),
  setRecentDestinations: (destinations) => set({ recentDestinations: destinations }),
  setOperations: (operations) => set({ operations }),
  setProgress: (progress) => set({ progress }),
  setStatus: (status) => set({ status }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setDestination: (dest) => set({ destination: dest }),
  setUndoJournal: (journal) => set({ undoJournal: journal }),
  setFilterState: (state) => set((s) => ({ filterState: { ...s.filterState, ...state } })),

  toggleItem: (id) => set((s) => ({
    selectedItems: s.selectedItems.map((i) => i.id === id ? { ...i, selected: !i.selected } : i),
  })),

  setResolution: (operationId, resolution) => set((s) => ({
    operations: s.operations.map((o) => o.id === operationId ? { ...o, resolution } : o),
  })),

  fetchPreviewAction: async (srcPaths, dest) => {
    set({ loading: true, error: null });
    try {
      const results = await Promise.all(
        srcPaths.map((p) => moveFileDryRunTauri(p, dest, 0)),
      );
      set({ operations: toMoveOperations(results), status: "ready", loading: false });
    } catch (err) {
      set({ loading: false, error: String(err) });
    }
  },

  startMoveAction: async (srcPaths, dest) => {
    set({ status: "moving", error: null });
    try {
      const results = await Promise.all(
        srcPaths.map((p) => moveFileTauri(p, dest, 0, false)),
      );
      set({ operations: toMoveOperations(results), status: "completed" });
    } catch (err) {
      set({ status: "failed", error: String(err) });
    }
  },

  undoMoveAction: async (operationId) => {
    set({ loading: true, error: null });
    try {
      await undoMoveTauri(operationId);
      set({ loading: false });
    } catch (err) {
      set({ loading: false, error: String(err) });
    }
  },

  fetchUndoJournalAction: async () => {
    set({ loading: true, error: null });
    try {
      const journal = await fetchMoveHistoryTauri();
      set({ undoJournal: journal, loading: false });
    } catch (err) {
      set({ loading: false, error: String(err) });
    }
  },
}));
