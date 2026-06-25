import { listen } from "@tauri-apps/api/event";
import type { ScanProgress, ScanResult, MoveProgress, CacheStatus } from "@/types";
import type {
  DuplicateProgress, DuplicateResult, HealthProgress, HealthComplete,
  ErrorEvent, CacheProgress,
} from "@/types/events";
import { isTauriAvailable } from "./tauriCheck";
import { globalEventBus, EventChannels } from "./eventBus";

export type ScanProgressHandler = (progress: ScanProgress) => void;
export type ScanCompleteHandler = (result: ScanResult) => void;
export type ScanErrorHandler = (error: string) => void;
export type MoveProgressHandler = (progress: MoveProgress) => void;
export type MoveErrorHandler = (error: string) => void;
export type CacheStatusHandler = (status: CacheStatus) => void;
export type CacheProgressHandler = (payload: CacheProgress) => void;
export type ErrorEventHandler = (event: ErrorEvent) => void;
export type DuplicateProgressHandler = (progress: DuplicateProgress) => void;
export type DuplicateCompleteHandler = (result: DuplicateResult) => void;
export type DuplicateErrorHandler = (error: string) => void;
export type HealthProgressHandler = (progress: HealthProgress) => void;
export type HealthCompleteHandler = (result: HealthComplete) => void;

export interface EventUnsubscribers {
  scanProgress: () => void;
  scanComplete: () => void;
  scanError: () => void;
  moveProgress: () => void;
  moveError: () => void;
  cacheStatus: () => void;
  cacheProgress: () => void;
  errorEvent: () => void;
  duplicateProgress: () => void;
  duplicateComplete: () => void;
  duplicateError: () => void;
  healthProgress: () => void;
  healthComplete: () => void;
  unlistenAll: () => void;
}

function noop(): void {}

function bridgeLog(eventName: string, payload: unknown): void {
  globalEventBus.addLog({
    eventName,
    payload,
    severity: eventName.includes("error") ? "error" : "info",
  });
}

export async function registerEventListeners(
  handlers: {
    onScanProgress?: ScanProgressHandler;
    onScanComplete?: ScanCompleteHandler;
    onScanError?: ScanErrorHandler;
    onMoveProgress?: MoveProgressHandler;
    onMoveError?: MoveErrorHandler;
    onCacheStatus?: CacheStatusHandler;
    onCacheProgress?: CacheProgressHandler;
    onErrorEvent?: ErrorEventHandler;
    onDuplicateProgress?: DuplicateProgressHandler;
    onDuplicateComplete?: DuplicateCompleteHandler;
    onDuplicateError?: DuplicateErrorHandler;
    onHealthProgress?: HealthProgressHandler;
    onHealthComplete?: HealthCompleteHandler;
  },
): Promise<EventUnsubscribers> {
  if (!isTauriAvailable()) {
    return {
      scanProgress: noop, scanComplete: noop, scanError: noop,
      moveProgress: noop, moveError: noop, cacheStatus: noop, cacheProgress: noop,
      errorEvent: noop, duplicateProgress: noop, duplicateComplete: noop,
      duplicateError: noop, healthProgress: noop, healthComplete: noop,
      unlistenAll: noop,
    };
  }

  const unlisteners: (() => void)[] = [];

  const safeListen = async <T>(
    event: string,
    handler: ((payload: T) => void) | undefined,
    transform?: (raw: unknown) => T,
  ): Promise<void> => {
    if (!handler) return;
    try {
      const u = await listen<T>(event, (eventPayload) => {
        const p = transform ? transform(eventPayload.payload as unknown) : eventPayload.payload;
        bridgeLog(event, p);
        try {
          handler(p);
        } catch (innerErr) {
          console.error(`[Events] Handler error for "${event}":`, innerErr);
          globalEventBus.addLog({
            eventName: event,
            payload: { error: String(innerErr), original: p },
            severity: "error",
          });
        }
      });
      unlisteners.push(u);
    } catch (err) {
      console.error(`[Events] Failed to listen for "${event}":`, err);
      globalEventBus.addLog({
        eventName: event,
        payload: { setupError: String(err) },
        severity: "error",
      });
    }
  };

  await Promise.all([
    safeListen<ScanProgress>(EventChannels.SCAN_PROGRESS, handlers.onScanProgress),
    safeListen<ScanResult>(EventChannels.SCAN_COMPLETE, handlers.onScanComplete),
    safeListen<string>(EventChannels.SCAN_ERROR, handlers.onScanError),
    safeListen<MoveProgress>(EventChannels.MOVE_PROGRESS, handlers.onMoveProgress),
    safeListen<string>(EventChannels.MOVE_ERROR, handlers.onMoveError),
    safeListen<CacheStatus>(EventChannels.CACHE_PROGRESS, handlers.onCacheStatus, (raw) => {
      if (typeof raw === "string") return raw as CacheStatus;
      if (raw && typeof raw === "object" && "status" in (raw as Record<string, unknown>)) {
        return (raw as CacheProgress).status;
      }
      return "idle" as CacheStatus;
    }),
    safeListen<CacheProgress>(EventChannels.CACHE_PROGRESS, handlers.onCacheProgress),
    safeListen<ErrorEvent>(EventChannels.ERROR_OCCURRED, handlers.onErrorEvent),
    safeListen<DuplicateProgress>(EventChannels.DUPLICATE_PROGRESS, handlers.onDuplicateProgress),
    safeListen<DuplicateResult>(EventChannels.DUPLICATE_COMPLETE, handlers.onDuplicateComplete),
    safeListen<string>(EventChannels.DUPLICATE_ERROR, handlers.onDuplicateError),
    safeListen<HealthProgress>(EventChannels.HEALTH_PROGRESS, handlers.onHealthProgress),
    safeListen<HealthComplete>(EventChannels.HEALTH_COMPLETE, handlers.onHealthComplete),
  ]);

  const unlistenAll = () => {
    for (const u of unlisteners) {
      try { u(); } catch { /* ok */ }
    }
  };

  const getUnsub = (index: number) => unlisteners[index] ?? noop;

  return {
    scanProgress: getUnsub(0),
    scanComplete: getUnsub(1),
    scanError: getUnsub(2),
    moveProgress: getUnsub(3),
    moveError: getUnsub(4),
    cacheStatus: getUnsub(5),
    cacheProgress: getUnsub(6),
    errorEvent: getUnsub(7),
    duplicateProgress: getUnsub(8),
    duplicateComplete: getUnsub(9),
    duplicateError: getUnsub(10),
    healthProgress: getUnsub(11),
    healthComplete: getUnsub(12),
    unlistenAll,
  };
}
