import { create } from "zustand";
import type {
  MockMoveItem,
  MockSuggestedLocation,
  MockRecentDestination,
  MockMoveOperation,
  MockMoveProgress,
  MockUndoJournalEntry,
  MockFilterState,
  MockResolution,
} from "@/mocks/move";
import { defaultFilterState } from "@/mocks/move";

export type MoveStatus = "idle" | "previewing" | "ready" | "moving" | "paused" | "completed" | "cancelled" | "failed";

interface MoveStore {
  selectedItems: MockMoveItem[];
  destination: string;
  destinationError: string | null;
  suggestedLocations: MockSuggestedLocation[];
  recentDestinations: MockRecentDestination[];
  operations: MockMoveOperation[];
  progress: MockMoveProgress | null;
  status: MoveStatus;
  filter: MockFilterState;
  undoJournal: MockUndoJournalEntry[];
  selectedUndoId: string | null;
  loading: boolean;

  setSelectedItems: (items: MockMoveItem[]) => void;
  setDestination: (dest: string) => void;
  setDestinationError: (error: string | null) => void;
  setOperations: (ops: MockMoveOperation[]) => void;
  setProgress: (progress: MockMoveProgress | null) => void;
  setStatus: (status: MoveStatus) => void;
  updateFilter: (partial: Partial<MockFilterState>) => void;
  setUndoJournal: (journal: MockUndoJournalEntry[]) => void;
  setSelectedUndoId: (id: string | null) => void;
  setLoading: (loading: boolean) => void;

  setResolution: (operationId: string, resolution: MockResolution) => void;
  setAllResolutions: (resolution: MockResolution) => void;
  suggestDestination: (path: string) => void;
  selectRecentDestination: (path: string) => void;

  startMove: () => void;
  cancelMove: () => void;
  pauseMove: () => void;
  resumeMove: () => void;
}

export const useMoveStore = create<MoveStore>((set) => ({
  selectedItems: [],
  destination: "",
  destinationError: null,
  suggestedLocations: [],
  recentDestinations: [],
  operations: [],
  progress: null,
  status: "idle",
  filter: defaultFilterState,
  undoJournal: [],
  selectedUndoId: null,
  loading: false,

  setSelectedItems: (items) => set({ selectedItems: items }),
  setDestination: (dest) => set({ destination: dest, destinationError: null }),
  setDestinationError: (error) => set({ destinationError: error }),
  setOperations: (ops) => set({ operations: ops, loading: false }),
  setProgress: (progress) => set({ progress }),
  setStatus: (status) => set({ status }),
  updateFilter: (partial) => set((s) => ({ filter: { ...s.filter, ...partial } })),
  setUndoJournal: (journal) => set({ undoJournal: journal }),
  setSelectedUndoId: (id) => set({ selectedUndoId: id }),
  setLoading: (loading) => set({ loading }),

  setResolution: (operationId, resolution) =>
    set((s) => ({
      operations: s.operations.map((op) =>
        op.id === operationId ? { ...op, resolution } : op,
      ),
    })),

  setAllResolutions: (resolution) =>
    set((s) => ({
      operations: s.operations.map((op) => ({ ...op, resolution })),
    })),

  suggestDestination: (path) => set({ destination: path, destinationError: null }),

  selectRecentDestination: (path) => set({ destination: path, destinationError: null }),

  startMove: () => set({ status: "moving" }),
  cancelMove: () => set({ status: "cancelled" }),
  pauseMove: () => set({ status: "paused" }),
  resumeMove: () => set({ status: "moving" }),
}));
