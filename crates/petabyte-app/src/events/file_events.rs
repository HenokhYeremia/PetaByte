use tauri::Emitter;
use petabyte_shared_models::entities::FileEntry;

pub fn emit_file_found(handle: &tauri::AppHandle, entry: &FileEntry) {
    let _ = handle.emit("file:found", entry);
}

pub fn emit_files_updated(handle: &tauri::AppHandle, count: u64) {
    let _ = handle.emit("file:updated", count);
}
