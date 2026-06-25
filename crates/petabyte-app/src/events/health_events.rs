use petabyte_shared_models::ports::HealthProgressPayload;
use tauri::Emitter;

pub fn emit_health_analysis_progress(handle: &tauri::AppHandle, payload: &HealthProgressPayload) {
    let _ = handle.emit("health:progress", payload);
}

pub fn emit_health_complete(handle: &tauri::AppHandle, overall_score: u64, grade: &str) {
    let _ = handle.emit(
        "health:complete",
        serde_json::json!({
            "overall_score": overall_score,
            "grade": grade,
        }),
    );
}
