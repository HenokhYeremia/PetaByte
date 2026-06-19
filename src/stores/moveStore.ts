import { create } from "zustand";
import type { MovePreview } from "@/types";

interface MoveStore {
  preview: MovePreview | null;
  history: MovePreview[];
  loading: boolean;
  setPreview: (preview: MovePreview | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useMoveStore = create<MoveStore>((set) => ({
  preview: null,
  history: [],
  loading: false,
  setPreview: (preview) => set({ preview, loading: false }),
  setLoading: (loading) => set({ loading }),
}));
