import { useState, useCallback, useEffect } from "react";
import { globalEventBus, type EventLogEntry } from "@/bridge/eventBus";

export interface UseEventLogOptions {
  maxEntries?: number;
  filterEventName?: string;
  autoRefresh?: boolean;
}

export function useEventLog(options: UseEventLogOptions = {}) {
  const { maxEntries = 100, filterEventName, autoRefresh = true } = options;
  const [entries, setEntries] = useState<readonly EventLogEntry[]>([]);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      setRefreshTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  useEffect(() => {
    const all = globalEventBus.getLog();
    let filtered = filterEventName
      ? all.filter((e) => e.eventName === filterEventName)
      : all;
    if (filtered.length > maxEntries) {
      filtered = filtered.slice(filtered.length - maxEntries);
    }
    setEntries(filtered);
  }, [refreshTick, filterEventName, maxEntries]);

  const clearLog = useCallback(() => {
    globalEventBus.clearLog();
    setEntries([]);
  }, []);

  const refresh = useCallback(() => {
    setRefreshTick((t) => t + 1);
  }, []);

  return { entries, clearLog, refresh };
}
