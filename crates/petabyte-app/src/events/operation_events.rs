use tauri::Emitter;

pub fn emit_move_complete(
    handle: &tauri::AppHandle,
    source: &str,
    destination: &str,
    file_size: u64,
) {
    let _ = handle.emit(
        "move:done",
        serde_json::json!({
            "source": source,
            "destination": destination,
            "file_size": file_size,
        }),
    );
}

pub fn emit_clean_complete(handle: &tauri::AppHandle, bytes_freed: u64, entries_removed: usize) {
    let _ = handle.emit(
        "clean:done",
        serde_json::json!({
            "bytes_freed": bytes_freed,
            "entries_removed": entries_removed,
        }),
    );
}

pub fn emit_move_error(handle: &tauri::AppHandle, error: &str) {
    let _ = handle.emit("move:error", error);
}
