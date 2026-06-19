use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MoveRequest {
    pub source_path: String,
    pub destination_path: String,
    pub file_size: u64,
    pub use_trash: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MoveResultDto {
    pub operation_id: String,
    pub source_path: String,
    pub destination_path: String,
    pub file_size: u64,
    pub status: String,
    pub error: Option<String>,
}
