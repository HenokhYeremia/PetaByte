use std::path::Path;
use std::sync::Arc;

use petabyte_shared_models::entities::MoveOperation;
use petabyte_shared_models::ports::{FileOpPort, MoveJournalPort};
use petabyte_shared_models::value_objects::FilePath;

use crate::dto::{MoveRequest, MoveResultDto};
use crate::error::EngineError;

pub struct SmartMoveUseCase {
    file_op: Arc<dyn FileOpPort>,
    journal: Arc<dyn MoveJournalPort>,
}

impl SmartMoveUseCase {
    pub fn new(file_op: Arc<dyn FileOpPort>, journal: Arc<dyn MoveJournalPort>) -> Self {
        Self { file_op, journal }
    }

    pub fn move_file(&self, request: &MoveRequest) -> Result<MoveResultDto, EngineError> {
        let source = FilePath::new(&request.source_path)
            .map_err(|e| EngineError::Validation(format!("Invalid source path: {e}")))?;
        let dest = FilePath::new(&request.destination_path)
            .map_err(|e| EngineError::Validation(format!("Invalid destination path: {e}")))?;

        let operation = MoveOperation::new(source.clone(), dest.clone(), request.file_size);

        self.journal.record(&operation).map_err(EngineError::Port)?;

        if request.use_trash {
            self.file_op
                .send_to_trash(source.as_ref())
                .map_err(EngineError::Port)?;
        } else {
            self.file_op
                .copy(source.as_ref(), dest.as_ref())
                .map_err(EngineError::Port)?;

            let verified = self
                .file_op
                .verify_integrity(source.as_ref(), dest.as_ref())
                .map_err(EngineError::Port)?;

            if !verified {
                return Err(EngineError::Port("Integrity check failed".into()));
            }

            self.file_op
                .delete(source.as_ref())
                .map_err(EngineError::Port)?;
        }

        Ok(MoveResultDto {
            operation_id: operation.id.to_string(),
            source_path: request.source_path.clone(),
            destination_path: request.destination_path.clone(),
            file_size: request.file_size,
            status: "completed".into(),
            error: None,
        })
    }

    pub fn get_history(&self, limit: usize) -> Result<Vec<MoveOperation>, EngineError> {
        self.journal.get_history(limit).map_err(EngineError::Port)
    }

    pub fn undo(&self, operation_id: &uuid::Uuid) -> Result<(), EngineError> {
        let pending = self.journal.get_pending().map_err(EngineError::Port)?;
        let op = pending
            .iter()
            .find(|o| o.id == *operation_id)
            .ok_or_else(|| EngineError::NotFound("Operation not found in pending".into()))?;

        let source_str = op.destination_path.as_str().to_string();
        let dest_str = op.source_path.as_str().to_string();
        let source = Path::new(&source_str);
        let dest = Path::new(&dest_str);

        if source.exists() {
            std::fs::rename(source, dest)
                .map_err(|e| EngineError::Port(format!("Failed to undo move: {e}")))?;
        }

        self.journal
            .mark_reverted(operation_id)
            .map_err(EngineError::Port)?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use petabyte_shared_models::entities::MoveStatus;
    use std::sync::Mutex;

    struct MockFileOp;
    impl FileOpPort for MockFileOp {
        fn copy(&self, _source: &Path, _dest: &Path) -> Result<(), String> {
            Ok(())
        }
        fn move_file(&self, _source: &Path, _dest: &Path) -> Result<(), String> {
            Ok(())
        }
        fn delete(&self, _path: &Path) -> Result<(), String> {
            Ok(())
        }
        fn send_to_trash(&self, _path: &Path) -> Result<(), String> {
            Ok(())
        }
        fn verify_integrity(&self, _source: &Path, _dest: &Path) -> Result<bool, String> {
            Ok(true)
        }
    }

    struct MockJournal {
        operations: Mutex<Vec<MoveOperation>>,
    }
    impl MoveJournalPort for MockJournal {
        fn record(&self, operation: &MoveOperation) -> Result<(), String> {
            self.operations.lock().unwrap().push(operation.clone());
            Ok(())
        }
        fn record_batch(&self, operations: &[MoveOperation]) -> Result<(), String> {
            self.operations
                .lock()
                .unwrap()
                .extend_from_slice(operations);
            Ok(())
        }
        fn get_history(&self, _limit: usize) -> Result<Vec<MoveOperation>, String> {
            Ok(self.operations.lock().unwrap().clone())
        }
        fn get_pending(&self) -> Result<Vec<MoveOperation>, String> {
            Ok(self
                .operations
                .lock()
                .unwrap()
                .iter()
                .filter(|o| o.status == MoveStatus::Pending || o.status == MoveStatus::Copying)
                .cloned()
                .collect())
        }
        fn mark_completed(&self, _operation_id: &uuid::Uuid) -> Result<(), String> {
            Ok(())
        }
        fn mark_failed(&self, _operation_id: &uuid::Uuid, _error: &str) -> Result<(), String> {
            Ok(())
        }
        fn mark_reverted(&self, _operation_id: &uuid::Uuid) -> Result<(), String> {
            Ok(())
        }
        fn remove(&self, _operation_id: &uuid::Uuid) -> Result<(), String> {
            Ok(())
        }
        fn clear_history(&self) -> Result<(), String> {
            Ok(())
        }
    }

    #[test]
    fn test_move_file_trash() {
        let use_case = SmartMoveUseCase::new(
            Arc::new(MockFileOp),
            Arc::new(MockJournal {
                operations: Mutex::new(vec![]),
            }),
        );

        let request = MoveRequest {
            source_path: "C:\\source.txt".into(),
            destination_path: "C:\\dest.txt".into(),
            file_size: 100,
            use_trash: true,
        };

        let result = use_case.move_file(&request).unwrap();
        assert_eq!(result.status, "completed");
    }

    #[test]
    fn test_move_file_copy() {
        let use_case = SmartMoveUseCase::new(
            Arc::new(MockFileOp),
            Arc::new(MockJournal {
                operations: Mutex::new(vec![]),
            }),
        );

        let request = MoveRequest {
            source_path: "C:\\source.txt".into(),
            destination_path: "C:\\dest.txt".into(),
            file_size: 100,
            use_trash: false,
        };

        let result = use_case.move_file(&request).unwrap();
        assert_eq!(result.status, "completed");
    }
}
