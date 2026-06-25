export { isTauriAvailable, resetTauriCheck } from "./tauriCheck";

export {
  fetchDrives,
  startScanTauri,
  cancelScanTauri,
  getScanStatusTauri,
  getEntryCountTauri,
} from "./scanner";

export { fetchHealthScore, fetchHealthRecommendations } from "./health";
export type { HealthBridgeResult } from "./health";

export { fetchDuplicates } from "./duplicates";
export type { DuplicateBridgeResult } from "./duplicates";

export {
  scanCacheTauri,
  cleanCacheTauri,
  cacheTotalSizeTauri,
  computePreview,
} from "./cache";
export type { CacheBridgeResult } from "./cache";

export {
  moveFileTauri,
  undoMoveTauri,
  fetchMoveHistoryTauri,
  moveFileDryRunTauri,
} from "./move";


export { registerEventListeners } from "./events";
export type {
  ScanProgressHandler,
  ScanCompleteHandler,
  ScanErrorHandler,
  MoveProgressHandler,
  MoveErrorHandler,
  CacheStatusHandler,
  CacheProgressHandler,
  ErrorEventHandler,
  DuplicateProgressHandler,
  DuplicateCompleteHandler,
  DuplicateErrorHandler,
  HealthProgressHandler,
  HealthCompleteHandler,
  EventUnsubscribers,
} from "./events";

export { globalEventBus, EventChannels } from "./eventBus";
export type { EventLogEntry, EventPriority } from "./eventBus";
