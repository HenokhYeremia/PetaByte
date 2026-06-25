import { invoke } from "@tauri-apps/api/core";
import type { Drive, ScanProgress } from "@/types";

function maybeParse<T>(raw: unknown): T {
  if (typeof raw === "string") return JSON.parse(raw) as T;
  return raw as T;
}

export async function fetchDrives(): Promise<Drive[]> {
  try {
    const raw: unknown = await invoke("get_scan_status");
    if (typeof raw === "string") {
      if (raw === "idle" || raw === "scanning") return [];
      const parsed = JSON.parse(raw);
      return (parsed.drives ?? []) as Drive[];
    }
    return [];
  } catch {
    return [];
  }
}

export async function startScanTauri(rootPath: string): Promise<string> {
  return invoke("start_scan", { rootPath });
}

export async function cancelScanTauri(): Promise<void> {
  await invoke("cancel_scan");
}

export async function getScanStatusTauri(): Promise<ScanProgress | null> {
  try {
    const raw: unknown = await invoke<string>("get_scan_status");
    if (typeof raw === "string") {
      if (raw === "idle" || raw === "scanning") return null;
      return JSON.parse(raw) as ScanProgress;
    }
    return null;
  } catch {
    return null;
  }
}

export async function getEntryCountTauri(): Promise<number> {
  const raw: unknown = await invoke("get_entry_count");
  return maybeParse<number>(raw);
}
