export type EventPriority = "low" | "normal" | "high";

export interface EventLogEntry {
  id: string;
  eventName: string;
  timestamp: number;
  payload: unknown;
  severity: "info" | "warning" | "error";
}

type Listener<T = unknown> = (payload: T) => void;

interface EventChannel<T = unknown> {
  listeners: Set<Listener<T>>;
  lastPayload: T | null;
}

class GlobalEventBus {
  private channels = new Map<string, EventChannel>();
  private log: EventLogEntry[] = [];
  private maxLogSize = 500;
  private recoveryQueue: Array<{ eventName: string; payload: unknown }> = [];

  private getChannel<T>(eventName: string): EventChannel<T> {
    let ch = this.channels.get(eventName) as EventChannel<T> | undefined;
    if (!ch) {
      ch = { listeners: new Set(), lastPayload: null } as EventChannel<T>;
      this.channels.set(eventName, ch as EventChannel);
    }
    return ch;
  }

  emit<T>(eventName: string, payload: T): void {
    const ch = this.getChannel<T>(eventName);
    ch.lastPayload = payload;
    for (const listener of ch.listeners) {
      try {
        listener(payload);
      } catch (err) {
        console.error(`[EventBus] Listener error on "${eventName}":`, err);
      }
    }
  }

  on<T>(eventName: string, listener: Listener<T>): () => void {
    const ch = this.getChannel<T>(eventName);
    ch.listeners.add(listener as Listener);
    return () => {
      ch.listeners.delete(listener as Listener);
    };
  }

  once<T>(eventName: string, listener: Listener<T>): () => void {
    const wrapper: Listener<T> = (payload: T) => {
      unsubscribe();
      listener(payload);
    };
    const unsubscribe = this.on(eventName, wrapper);
    return unsubscribe;
  }

  getLastPayload<T>(eventName: string): T | null {
    const ch = this.channels.get(eventName);
    return (ch?.lastPayload as T | null) ?? null;
  }

  getListenerCount(eventName: string): number {
    return this.channels.get(eventName)?.listeners.size ?? 0;
  }

  clearChannel(eventName: string): void {
    this.channels.delete(eventName);
  }

  clearAll(): void {
    this.channels.clear();
    this.log = [];
    this.recoveryQueue = [];
  }

  addLog(entry: Omit<EventLogEntry, "id" | "timestamp">): void {
    this.log.push({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      ...entry,
    });
    if (this.log.length > this.maxLogSize) {
      this.log = this.log.slice(this.log.length - this.maxLogSize);
    }
  }

  getLog(): readonly EventLogEntry[] {
    return this.log;
  }

  clearLog(): void {
    this.log = [];
  }

  queueForRecovery(eventName: string, payload: unknown): void {
    this.recoveryQueue.push({ eventName, payload });
  }

  drainRecoveryQueue(): void {
    const queue = this.recoveryQueue.splice(0);
    for (const item of queue) {
      this.emit(item.eventName, item.payload);
    }
  }

  getRecoveryQueueSize(): number {
    return this.recoveryQueue.length;
  }
}

export const globalEventBus = new GlobalEventBus();

export const EventChannels = {
  SCAN_PROGRESS: "scan:progress",
  SCAN_COMPLETE: "scan:complete",
  SCAN_ERROR: "scan:error",
  DUPLICATE_PROGRESS: "duplicate:progress",
  DUPLICATE_COMPLETE: "duplicate:complete",
  DUPLICATE_ERROR: "duplicate:error",
  MOVE_PROGRESS: "move:progress",
  MOVE_COMPLETE: "move:done",
  MOVE_ERROR: "move:error",
  CACHE_PROGRESS: "cache:progress",
  CACHE_COMPLETE: "cache:done",
  HEALTH_PROGRESS: "health:progress",
  HEALTH_COMPLETE: "health:complete",
  ERROR_OCCURRED: "error:occurred",
} as const;
