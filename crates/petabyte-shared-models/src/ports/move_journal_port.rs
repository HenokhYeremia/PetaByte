use crate::entities::MoveOperation;
use uuid::Uuid;

pub trait MoveJournalPort: Send + Sync {
    fn record(&self, operation: &MoveOperation) -> Result<(), String>;
    fn record_batch(&self, operations: &[MoveOperation]) -> Result<(), String>;
    fn get_history(&self, limit: usize) -> Result<Vec<MoveOperation>, String>;
    fn get_pending(&self) -> Result<Vec<MoveOperation>, String>;
    fn mark_completed(&self, operation_id: &Uuid) -> Result<(), String>;
    fn mark_failed(&self, operation_id: &Uuid, error: &str) -> Result<(), String>;
    fn mark_reverted(&self, operation_id: &Uuid) -> Result<(), String>;
    fn remove(&self, operation_id: &Uuid) -> Result<(), String>;
    fn clear_history(&self) -> Result<(), String>;
}
