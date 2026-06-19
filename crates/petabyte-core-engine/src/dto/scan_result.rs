use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanResultDto {
    pub session_id: String,
    pub total_files: u64,
    pub total_dirs: u64,
    pub total_size: u64,
    pub total_errors: u64,
    pub elapsed_ms: u64,
    pub status: String,
}
