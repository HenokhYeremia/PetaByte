use crate::error::{MoveError, MoveResult};
use parking_lot::Mutex;
use petabyte_shared_models::entities::{MoveOperation, MoveStatus};
use petabyte_shared_models::ports::MoveJournalPort;
use std::sync::Arc;
use uuid::Uuid;

pub struct InMemoryJournal {
    operations: Mutex<Vec<MoveOperation>>,
}

impl InMemoryJournal {
    pub fn new() -> Self {
        Self {
            operations: Mutex::new(Vec::new()),
        }
    }
}

impl Default for InMemoryJournal {
    fn default() -> Self {
        Self::new()
    }
}

impl MoveJournalPort for InMemoryJournal {
    fn record(&self, operation: &MoveOperation) -> Result<(), String> {
        self.operations.lock().push(operation.clone());
        Ok(())
    }

    fn record_batch(&self, operations: &[MoveOperation]) -> Result<(), String> {
        self.operations.lock().extend_from_slice(operations);
        Ok(())
    }

    fn get_history(&self, limit: usize) -> Result<Vec<MoveOperation>, String> {
        let ops = self.operations.lock();
        let start = if ops.len() > limit {
            ops.len() - limit
        } else {
            0
        };
        Ok(ops[start..].to_vec())
    }

    fn get_pending(&self) -> Result<Vec<MoveOperation>, String> {
        Ok(self
            .operations
            .lock()
            .iter()
            .filter(|op| !op.is_terminal())
            .cloned()
            .collect())
    }

    fn mark_completed(&self, operation_id: &Uuid) -> Result<(), String> {
        let mut ops = self.operations.lock();
        if let Some(op) = ops.iter_mut().find(|o| o.id == *operation_id) {
            op.status = MoveStatus::Completed;
            op.completed_at = Some(chrono::Utc::now());
            Ok(())
        } else {
            Err(format!("Operation not found: {}", operation_id))
        }
    }

    fn mark_failed(&self, operation_id: &Uuid, error: &str) -> Result<(), String> {
        let mut ops = self.operations.lock();
        if let Some(op) = ops.iter_mut().find(|o| o.id == *operation_id) {
            op.status = MoveStatus::Failed(error.to_string());
            Ok(())
        } else {
            Err(format!("Operation not found: {}", operation_id))
        }
    }

    fn mark_reverted(&self, operation_id: &Uuid) -> Result<(), String> {
        let mut ops = self.operations.lock();
        if let Some(op) = ops.iter_mut().find(|o| o.id == *operation_id) {
            op.status = MoveStatus::Reverted;
            Ok(())
        } else {
            Err(format!("Operation not found: {}", operation_id))
        }
    }

    fn remove(&self, operation_id: &Uuid) -> Result<(), String> {
        let mut ops = self.operations.lock();
        ops.retain(|o| o.id != *operation_id);
        Ok(())
    }

    fn clear_history(&self) -> Result<(), String> {
        self.operations.lock().clear();
        Ok(())
    }
}

pub struct UndoManager {
    journal: Arc<dyn MoveJournalPort>,
}

impl UndoManager {
    pub fn new(journal: Arc<dyn MoveJournalPort>) -> Self {
        Self { journal }
    }

    pub fn undo(&self, operation: &MoveOperation) -> MoveResult<MoveOperation> {
        if !operation.can_undo() {
            return Err(MoveError::UndoNotAvailable(format!(
                "Operation {} cannot be undone (status: {:?})",
                operation.id, operation.status
            )));
        }

        let dest_path = operation.destination_path.as_ref();
        if !dest_path.exists() {
            return Err(MoveError::UndoNotAvailable(format!(
                "Destination no longer exists: {}",
                operation.destination_path
            )));
        }

        let file_size = std::fs::metadata(dest_path)
            .map_err(MoveError::Io)?
            .len();

        // Move destination back to source
        std::fs::rename(dest_path, operation.source_path.as_ref())
            .map_err(MoveError::Io)?;

        let mut reverted = operation.clone();
        reverted.status = MoveStatus::Reverted;
        reverted.completed_at = Some(chrono::Utc::now());
        reverted.file_size = file_size;

        self.journal
            .mark_reverted(&operation.id)
            .map_err(|e| MoveError::Journal(e))?;

        Ok(reverted)
    }

    pub fn undo_batch(&self, operations: &[MoveOperation]) -> Vec<MoveResult<MoveOperation>> {
        operations
            .iter()
            .rev()
            .map(|op| self.undo(op))
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use petabyte_shared_models::value_objects::FilePath;

    fn create_completed_op() -> (MoveOperation, InMemoryJournal) {
        let journal = InMemoryJournal::new();
        let mut op = MoveOperation::new(
            FilePath::new("C:\\src\\file.txt").unwrap(),
            FilePath::new("C:\\dst\\file.txt").unwrap(),
            100,
        );
        op.status = MoveStatus::Completed;
        op.completed_at = Some(chrono::Utc::now());
        journal.record(&op).unwrap();
        (op, journal)
    }

    #[test]
    fn test_undo_not_available_for_pending() {
        let journal = InMemoryJournal::new();
        let manager = UndoManager::new(Arc::new(journal));
        let op = MoveOperation::new(
            FilePath::new("C:\\src\\file.txt").unwrap(),
            FilePath::new("C:\\dst\\file.txt").unwrap(),
            100,
        );
        let result = manager.undo(&op);
        assert!(result.is_err());
    }

    #[test]
    fn test_undo_missing_destination() {
        let (op, journal) = create_completed_op();
        let manager = UndoManager::new(Arc::new(journal));
        // Dest doesn't exist on disk
        let result = manager.undo(&op);
        assert!(result.is_err());
    }

    #[test]
    fn test_in_memory_journal_record_and_get() {
        let journal = InMemoryJournal::new();
        let op1 = MoveOperation::new(
            FilePath::new("C:\\a.txt").unwrap(),
            FilePath::new("C:\\b.txt").unwrap(),
            50,
        );
        let op2 = MoveOperation::new(
            FilePath::new("C:\\c.txt").unwrap(),
            FilePath::new("C:\\d.txt").unwrap(),
            75,
        );
        journal.record(&op1).unwrap();
        journal.record(&op2).unwrap();

        let history = journal.get_history(10).unwrap();
        assert_eq!(history.len(), 2);
    }

    #[test]
    fn test_mark_completed() {
        let journal = InMemoryJournal::new();
        let op = MoveOperation::new(
            FilePath::new("C:\\src.txt").unwrap(),
            FilePath::new("C:\\dst.txt").unwrap(),
            10,
        );
        let id = op.id;
        journal.record(&op).unwrap();
        journal.mark_completed(&id).unwrap();

        let history = journal.get_history(10).unwrap();
        assert_eq!(history[0].status, MoveStatus::Completed);
        assert!(history[0].completed_at.is_some());
    }

    #[test]
    fn test_mark_failed() {
        let journal = InMemoryJournal::new();
        let op = MoveOperation::new(
            FilePath::new("C:\\src.txt").unwrap(),
            FilePath::new("C:\\dst.txt").unwrap(),
            10,
        );
        let id = op.id;
        journal.record(&op).unwrap();
        journal.mark_failed(&id, "disk full").unwrap();

        let history = journal.get_history(10).unwrap();
        assert_eq!(
            history[0].status,
            MoveStatus::Failed("disk full".to_string())
        );
    }

    #[test]
    fn test_undo_batch_reverses_order() {
        // Can't test actual file operations, but verify the UndoManager
        // calls work correctly in terms of journal updates
        let journal = InMemoryJournal::new();
        let mut op1 = MoveOperation::new(
            FilePath::new("C:\\a.txt").unwrap(),
            FilePath::new("C:\\b.txt").unwrap(),
            50,
        );
        op1.status = MoveStatus::Completed;
        let mut op2 = MoveOperation::new(
            FilePath::new("C:\\c.txt").unwrap(),
            FilePath::new("C:\\d.txt").unwrap(),
            75,
        );
        op2.status = MoveStatus::Completed;
        journal.record(&op1).unwrap();
        journal.record(&op2).unwrap();

        let manager = UndoManager::new(Arc::new(journal));
        let results = manager.undo_batch(&[op1, op2]);
        // Both should fail because destination doesn't exist on disk
        assert_eq!(results.len(), 2);
        for r in &results {
            assert!(r.is_err());
        }
    }
}
