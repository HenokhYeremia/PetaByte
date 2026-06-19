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

pub trait ProgressEmitter: Send + Sync {
    fn on_progress(&self, payload: &ProgressPayload);
    fn on_error(&self, message: &str);
}
