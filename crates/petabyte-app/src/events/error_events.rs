use tauri::Emitter;

pub fn emit_error_occurred(handle: &tauri::AppHandle, source: &str, message: &str, severity: &str) {
    let _ = handle.emit(
        "error:occurred",
        serde_json::json!({
            "source": source,
            "message": message,
            "severity": severity,
        }),
    );
}
