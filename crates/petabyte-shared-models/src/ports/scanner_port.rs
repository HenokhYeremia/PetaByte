use crate::entities::FileEntry;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanProgress {
    pub scanned_files: u64,
    pub scanned_dirs: u64,
    pub scanned_size: u64,
    pub error_count: u64,
    pub elapsed_secs: u64,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanResult {
    pub session_id: String,
    pub total_files: u64,
    pub total_dirs: u64,
    pub total_size: u64,
    pub total_errors: u64,
    pub elapsed_ms: u64,
}

pub trait ScanBatchHandler: Send + Sync {
    fn handle_batch(&self, entries: &[FileEntry]) -> Result<(), String>;
    fn handle_complete(&self, result: &ScanResult) -> Result<(), String>;
}
