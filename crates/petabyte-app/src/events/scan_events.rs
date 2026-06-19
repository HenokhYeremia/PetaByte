use tauri::Emitter;
use petabyte_shared_models::ports::ProgressPayload;

pub fn emit_scan_progress(handle: &tauri::AppHandle, payload: &ProgressPayload) {
    let _ = handle.emit("scan:progress", payload);
}

pub fn emit_scan_complete(handle: &tauri::AppHandle, total_files: u64, total_dirs: u64, total_size: u64, elapsed_ms: u64) {
    let _ = handle.emit("scan:complete", serde_json::json!({
        "total_files": total_files,
        "total_dirs": total_dirs,
        "total_size": total_size,
        "elapsed_ms": elapsed_ms,
    }));
}

pub fn emit_scan_error(handle: &tauri::AppHandle, error: &str) {
    let _ = handle.emit("scan:error", error);
}
