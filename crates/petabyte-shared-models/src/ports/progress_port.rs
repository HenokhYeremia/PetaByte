use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProgressPayload {
    pub scanned_files: u64,
    pub scanned_dirs: u64,
    pub scanned_size: u64,
    pub error_count: u64,
    pub elapsed_secs: u64,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DuplicateProgressPayload {
    pub groups_found: u64,
    pub files_analyzed: u64,
    pub current_stage: String,
    pub percentage: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MoveProgressPayload {
    pub files_moved: u64,
    pub progress_percent: f64,
    pub current_operation: String,
    pub bytes_copied: u64,
    pub total_bytes: u64,
    pub elapsed_secs: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheProgressPayload {
    pub items_processed: u64,
    pub space_recovered: u64,
    pub status: String,
    pub total_items: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthProgressPayload {
    pub analysis_progress: f64,
    pub factor_evaluation_progress: f64,
    pub current_factor: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorEventPayload {
    pub source: String,
    pub message: String,
    pub severity: String,
}

pub trait ProgressEmitter: Send + Sync {
    fn on_progress(&self, payload: &ProgressPayload);
    fn on_error(&self, message: &str);

    fn on_duplicate_progress(&self, _payload: &DuplicateProgressPayload) {}
    fn on_duplicate_complete(&self, _groups_found: u64, _total_wasted_bytes: u64) {}
    fn on_duplicate_error(&self, _message: &str) {}

    fn on_move_progress(&self, _payload: &MoveProgressPayload) {}
    fn on_move_error(&self, _message: &str) {}
    fn on_move_complete(&self, _files_moved: u64, _total_bytes: u64) {}

    fn on_cache_progress(&self, _payload: &CacheProgressPayload) {}
    fn on_cache_complete(&self, _space_recovered: u64, _items_processed: u64) {}

    fn on_health_progress(&self, _payload: &HealthProgressPayload) {}
    fn on_health_complete(&self, _overall_score: u64, _grade: &str) {}

    fn on_error_event(&self, _source: &str, _message: &str, _severity: &str) {}
}
