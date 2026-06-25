use petabyte_shared_models::ports::DuplicateProgressPayload;
use tauri::Emitter;

pub fn emit_duplicate_progress(handle: &tauri::AppHandle, payload: &DuplicateProgressPayload) {
    let _ = handle.emit("duplicate:progress", payload);
}

pub fn emit_duplicate_complete(handle: &tauri::AppHandle, groups_found: u64, total_wasted_bytes: u64) {
    let _ = handle.emit(
        "duplicate:complete",
        serde_json::json!({
            "groups_found": groups_found,
            "total_wasted_bytes": total_wasted_bytes,
        }),
    );
}

pub fn emit_duplicate_error(handle: &tauri::AppHandle, error: &str) {
    let _ = handle.emit("duplicate:error", error);
}
