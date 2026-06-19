import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useCallback, useState } from "react";
import type { ScanProgress } from "@/types";

export function useScan() {
  const [progress, setProgress] = useState<ScanProgress | null>(null);

  useEffect(() => {
    const unlisten = listen<ScanProgress>("scan:progress", (event) => {
      setProgress(event.payload);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const startScan = useCallback(async (path: string) => {
    return invoke<string>("start_scan", { path });
  }, []);

  const pauseScan = useCallback(async () => {
    return invoke<void>("pause_scan");
  }, []);

  const resumeScan = useCallback(async () => {
    return invoke<void>("resume_scan");
  }, []);

  const cancelScan = useCallback(async () => {
    return invoke<void>("cancel_scan");
  }, []);

  return { progress, startScan, pauseScan, resumeScan, cancelScan };
}

export function useDuplicates() {
  const [loading, setLoading] = useState(false);

  const findDuplicates = useCallback(async (sessionId: string) => {
    setLoading(true);
    return invoke<string>("find_duplicates", { sessionId });
  }, []);

  return { loading, findDuplicates };
}

export function useHealth() {
  const [loading, setLoading] = useState(false);

  const calculateHealth = useCallback(async (volumeId: string) => {
    setLoading(true);
    return invoke<string>("calculate_health", { volumeId });
  }, []);

  return { loading, calculateHealth };
}
