use petabyte_shared_models::ports::{
    CacheProgressPayload, DuplicateProgressPayload, HealthProgressPayload, MoveProgressPayload,
    ProgressEmitter, ProgressPayload,
};

use crate::events;

#[derive(Clone)]
pub struct AppProgressEmitter {
    app_handle: tauri::AppHandle,
}

impl AppProgressEmitter {
    #[must_use]
    pub fn new(app_handle: tauri::AppHandle) -> Self {
        Self { app_handle }
    }
}

impl ProgressEmitter for AppProgressEmitter {
    fn on_progress(&self, payload: &ProgressPayload) {
        events::emit_scan_progress(&self.app_handle, payload);
    }

    fn on_error(&self, message: &str) {
        events::emit_scan_error(&self.app_handle, message);
    }

    fn on_duplicate_progress(&self, payload: &DuplicateProgressPayload) {
        events::emit_duplicate_progress(&self.app_handle, payload);
    }

    fn on_duplicate_complete(&self, groups_found: u64, total_wasted_bytes: u64) {
        events::emit_duplicate_complete(&self.app_handle, groups_found, total_wasted_bytes);
    }

    fn on_duplicate_error(&self, message: &str) {
        events::emit_duplicate_error(&self.app_handle, message);
    }

    fn on_move_progress(&self, payload: &MoveProgressPayload) {
        events::emit_move_progress(&self.app_handle, payload);
    }

    fn on_move_error(&self, message: &str) {
        events::emit_move_error(&self.app_handle, message);
    }

    fn on_move_complete(&self, _files_moved: u64, total_bytes: u64) {
        events::emit_move_complete(
            &self.app_handle,
            "batch",
            "destination",
            total_bytes,
        );
    }

    fn on_cache_progress(&self, payload: &CacheProgressPayload) {
        events::emit_cache_progress(&self.app_handle, payload);
    }

    fn on_cache_complete(&self, space_recovered: u64, items_processed: u64) {
        events::emit_cache_complete(&self.app_handle, space_recovered, items_processed as usize);
    }

    fn on_health_progress(&self, payload: &HealthProgressPayload) {
        events::emit_health_analysis_progress(&self.app_handle, payload);
    }

    fn on_health_complete(&self, overall_score: u64, grade: &str) {
        events::emit_health_complete(&self.app_handle, overall_score, grade);
    }

    fn on_error_event(&self, source: &str, message: &str, severity: &str) {
        events::emit_error_occurred(&self.app_handle, source, message, severity);
    }
}
