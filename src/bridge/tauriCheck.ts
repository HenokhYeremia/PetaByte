declare global {
  interface Window {
    __TAURI__?: Record<string, unknown>;
    __TAURI_INTERNALS__?: Record<string, unknown>;
  }
}

let _tauriAvailable: boolean | null = null;

export function isTauriAvailable(): boolean {
  if (_tauriAvailable !== null) return _tauriAvailable;
  _tauriAvailable =
    typeof window !== "undefined" &&
    (window.__TAURI__ !== undefined || window.__TAURI_INTERNALS__ !== undefined);
  return _tauriAvailable;
}

export function resetTauriCheck(): void {
  _tauriAvailable = null;
}
