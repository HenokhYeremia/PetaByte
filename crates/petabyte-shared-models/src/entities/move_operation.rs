use crate::value_objects::FilePath;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum MoveStatus {
    Pending,
    Copying,
    Verifying,
    Moving,
    Completed,
    Failed(String),
    Reverted,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MoveOperation {
    pub id: Uuid,
    pub source_path: FilePath,
    pub destination_path: FilePath,
    pub file_size: u64,
    pub started_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
    pub status: MoveStatus,
}

impl MoveOperation {
    #[must_use]
    pub fn new(source: FilePath, destination: FilePath, file_size: u64) -> Self {
        Self {
            id: Uuid::new_v4(),
            source_path: source,
            destination_path: destination,
            file_size,
            started_at: Utc::now(),
            completed_at: None,
            status: MoveStatus::Pending,
        }
    }

    #[must_use]
    pub fn is_terminal(&self) -> bool {
        matches!(
            self.status,
            MoveStatus::Completed | MoveStatus::Failed(_) | MoveStatus::Reverted
        )
    }

    #[must_use]
    pub fn can_undo(&self) -> bool {
        self.status == MoveStatus::Completed
    }
}
