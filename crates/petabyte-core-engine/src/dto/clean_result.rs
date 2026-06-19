use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CleanResultDto {
    pub entries_removed: Vec<String>,
    pub total_bytes_freed: u64,
    pub errors: Vec<String>,
}
