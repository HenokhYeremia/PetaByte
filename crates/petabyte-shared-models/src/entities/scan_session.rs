use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum ScanStatus {
    Idle,
    Pending,
    Scanning,
    Paused,
    Cancelled,
    Completed,
    Failed,
}

impl ScanStatus {
    pub fn is_terminal(&self) -> bool {
        matches!(self, Self::Completed | Self::Cancelled | Self::Failed)
    }

    pub fn is_active(&self) -> bool {
        matches!(self, Self::Pending | Self::Scanning | Self::Paused)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanSession {
    pub session_id: String,
    pub root_path: String,
    pub status: ScanStatus,
    pub started_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
    pub total_files: u64,
    pub total_dirs: u64,
    pub total_size: u64,
    pub total_errors: u64,
}

impl ScanSession {
    pub fn new(root_path: impl Into<String>) -> Self {
        Self {
            session_id: Uuid::new_v4().to_string(),
            root_path: root_path.into(),
            status: ScanStatus::Pending,
            started_at: Utc::now(),
            completed_at: None,
            total_files: 0,
            total_dirs: 0,
            total_size: 0,
            total_errors: 0,
        }
    }

    pub fn elapsed_seconds(&self) -> i64 {
        let end = self.completed_at.unwrap_or_else(Utc::now);
        (end - self.started_at).num_seconds()
    }
}
