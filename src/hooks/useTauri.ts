import { useEffect, useCallback, useState, useRef } from "react";
import { registerEventListeners, type EventUnsubscribers } from "@/bridge/events";
import type { ScanProgress, ScanResult, MoveProgress, CacheStatus } from "@/types";
import type { DuplicateProgress, HealthProgress, ErrorEvent } from "@/types/events";

export function useScanEvents() {
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const unsubsRef = useRef<EventUnsubscribers | null>(null);

  useEffect(() => {
    registerEventListeners({
      onScanProgress: (p) => setProgress(p),
      onScanComplete: (r) => setScanResult(r),
      onScanError: (e) => setScanError(e),
    }).then((unsubs) => { unsubsRef.current = unsubs; });
    return () => { unsubsRef.current?.unlistenAll(); };
  }, []);

  const reset = useCallback(() => {
    setProgress(null);
    setScanResult(null);
    setScanError(null);
  }, []);

  return { progress, scanResult, scanError, reset };
}

export function useDuplicates() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<DuplicateProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const unsubsRef = useRef<EventUnsubscribers | null>(null);

  useEffect(() => {
    registerEventListeners({
      onDuplicateProgress: (p) => setProgress(p),
      onDuplicateError: (e) => setError(e),
    }).then((unsubs) => { unsubsRef.current = unsubs; });
    return () => { unsubsRef.current?.unlistenAll(); };
  }, []);

  const findDuplicates = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { fetchDuplicates } = await import("@/bridge/duplicates");
    try {
      const result = await fetchDuplicates();
      setLoading(false);
      return result;
    } catch (err) {
      setError(String(err));
      setLoading(false);
      throw err;
    }
  }, []);

  return { loading, progress, error, findDuplicates };
}

export function useHealth() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<HealthProgress | null>(null);
  const unsubsRef = useRef<EventUnsubscribers | null>(null);

  useEffect(() => {
    registerEventListeners({
      onHealthProgress: (p) => setProgress(p),
    }).then((unsubs) => { unsubsRef.current = unsubs; });
    return () => { unsubsRef.current?.unlistenAll(); };
  }, []);

  const calculateHealth = useCallback(async () => {
    setLoading(true);
    const { fetchHealthScore } = await import("@/bridge/health");
    const result = await fetchHealthScore();
    setLoading(false);
    return result;
  }, []);

  return { loading, progress, calculateHealth };
}

export function useMoveEvents() {
  const [moveProgress, setMoveProgress] = useState<MoveProgress | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const unsubsRef = useRef<EventUnsubscribers | null>(null);

  useEffect(() => {
    registerEventListeners({
      onMoveProgress: (p) => setMoveProgress(p),
      onMoveError: (e) => setMoveError(e),
    }).then((unsubs) => { unsubsRef.current = unsubs; });
    return () => { unsubsRef.current?.unlistenAll(); };
  }, []);

  const reset = useCallback(() => {
    setMoveProgress(null);
    setMoveError(null);
  }, []);

  return { moveProgress, moveError, reset };
}

export function useCacheEvents() {
  const [cacheStatus, setCacheStatus] = useState<CacheStatus | null>(null);
  const [cacheProgress, setCacheProgress] = useState<{ items_processed: number; space_recovered: number; total_items: number } | null>(null);
  const unsubsRef = useRef<EventUnsubscribers | null>(null);

  useEffect(() => {
    registerEventListeners({
      onCacheStatus: (s) => setCacheStatus(s),
      onCacheProgress: (p) => setCacheProgress({ items_processed: p.items_processed, space_recovered: p.space_recovered, total_items: p.total_items }),
    }).then((unsubs) => { unsubsRef.current = unsubs; });
    return () => { unsubsRef.current?.unlistenAll(); };
  }, []);

  const reset = useCallback(() => {
    setCacheStatus(null);
    setCacheProgress(null);
  }, []);

  return { cacheStatus, cacheProgress, reset };
}

export function useGlobalErrorEvents() {
  const [error, setError] = useState<string | null>(null);
  const [errorEvent, setErrorEvent] = useState<ErrorEvent | null>(null);
  const unsubsRef = useRef<EventUnsubscribers | null>(null);

  useEffect(() => {
    registerEventListeners({
      onErrorEvent: (e) => {
        setErrorEvent(e);
        setError(e.message);
      },
    }).then((unsubs) => { unsubsRef.current = unsubs; });
    return () => { unsubsRef.current?.unlistenAll(); };
  }, []);

  const dismiss = useCallback(() => {
    setError(null);
    setErrorEvent(null);
  }, []);

  return { error, errorEvent, dismiss };
}

export function useDuplicateProgress() {
  const [progress, setProgress] = useState<DuplicateProgress | null>(null);
  const [complete, setComplete] = useState<{ groups_found: number; total_wasted_bytes: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const unsubsRef = useRef<EventUnsubscribers | null>(null);

  useEffect(() => {
    registerEventListeners({
      onDuplicateProgress: (p) => setProgress(p),
      onDuplicateComplete: (r) => setComplete(r),
      onDuplicateError: (e) => setError(e),
    }).then((unsubs) => { unsubsRef.current = unsubs; });
    return () => { unsubsRef.current?.unlistenAll(); };
  }, []);

  const reset = useCallback(() => {
    setProgress(null);
    setComplete(null);
    setError(null);
  }, []);

  return { progress, complete, error, reset };
}

export function useHealthProgress() {
  const [progress, setProgress] = useState<HealthProgress | null>(null);
  const [complete, setComplete] = useState<{ overall_score: number; grade: string } | null>(null);
  const unsubsRef = useRef<EventUnsubscribers | null>(null);

  useEffect(() => {
    registerEventListeners({
      onHealthProgress: (p) => setProgress(p),
      onHealthComplete: (r) => setComplete(r),
    }).then((unsubs) => { unsubsRef.current = unsubs; });
    return () => { unsubsRef.current?.unlistenAll(); };
  }, []);

  const reset = useCallback(() => {
    setProgress(null);
    setComplete(null);
  }, []);

  return { progress, complete, reset };
}
