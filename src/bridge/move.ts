import { invoke } from "@tauri-apps/api/core";
import type { MoveResultDto, UndoJournalEntry } from "@/types";

export async function moveFileTauri(
  sourcePath: string,
  destinationPath: string,
  fileSize: number,
  useTrash?: boolean,
): Promise<MoveResultDto> {
  return invoke<MoveResultDto>("move_file", {
    sourcePath,
    destinationPath,
    fileSize,
    useTrash: useTrash ?? true,
  });
}

export async function undoMoveTauri(operationId: string): Promise<void> {
  await invoke<void>("undo_move", { operationId });
}

export async function fetchMoveHistoryTauri(limit?: number): Promise<UndoJournalEntry[]> {
  const raw = await invoke<string>("move_history", { limit: limit ?? 50 });
  return JSON.parse(raw) as UndoJournalEntry[];
}

export async function moveFileDryRunTauri(
  sourcePath: string,
  destinationPath: string,
  fileSize: number,
): Promise<MoveResultDto> {
  return moveFileTauri(sourcePath, destinationPath, fileSize, true);
}
