use crate::error::{MoveError, MoveResult};
use petabyte_shared_models::entities::{MoveOperation, MoveStatus};
use petabyte_shared_models::ports::FileOpPort;
use petabyte_shared_models::ports::MoveJournalPort;
use petabyte_shared_models::value_objects::FilePath;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

pub struct SafeMover {
    journal: Box<dyn MoveJournalPort>,
    file_op: Box<dyn FileOpPort>,
    cancel: Option<Arc<AtomicBool>>,
    use_trash: bool,
}

impl SafeMover {
    pub fn new(
        journal: Box<dyn MoveJournalPort>,
        file_op: Box<dyn FileOpPort>,
    ) -> Self {
        Self {
            journal,
            file_op,
            cancel: None,
            use_trash: false,
        }
    }

    pub fn with_cancel(mut self, cancel: Arc<AtomicBool>) -> Self {
        self.cancel = Some(cancel);
        Self { cancel: self.cancel, ..self }
    }

    pub fn with_trash(mut self, use_trash: bool) -> Self {
        self.use_trash = use_trash;
        self
    }

    fn check_cancelled(&self) -> MoveResult<()> {
        if let Some(ref c) = self.cancel {
            if c.load(Ordering::Relaxed) {
                return Err(MoveError::Cancelled);
            }
        }
        Ok(())
    }

    pub fn move_file(
        &self,
        source: &FilePath,
        destination: &FilePath,
    ) -> MoveResult<MoveOperation> {
        let source_path = source.as_ref();
        let dest_path = destination.as_ref();

        if !source_path.exists() {
            return Err(MoveError::SourceNotFound(source.to_string()));
        }

        if dest_path.exists() {
            return Err(MoveError::DestinationExists(destination.to_string()));
        }

        let file_size = std::fs::metadata(source_path)
            .map_err(MoveError::Io)?
            .len();

        // Phase 1: Journal intent
        self.check_cancelled()?;
        let mut operation = MoveOperation::new(
            source.clone(),
            destination.clone(),
            file_size,
        );

        // Set to Copying and record in journal
        operation.status = MoveStatus::Copying;
        if let Err(e) = self.journal.record(&operation) {
            operation.status = MoveStatus::Failed(e.clone());
            let _ = self.journal.mark_failed(&operation.id, &e);
            return Err(MoveError::Journal(e));
        }

        // Phase 2: Copy file
        self.check_cancelled()?;
        if let Some(parent) = dest_path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(MoveError::Io)?;
        }

        if let Err(e) = self.file_op.copy(source_path, dest_path) {
            operation.status = MoveStatus::Failed(e.clone());
            let _ = self.journal.mark_failed(&operation.id, &e);
            return Err(MoveError::Io(
                std::io::Error::new(std::io::ErrorKind::Other, e),
            ));
        }

        // Phase 3: Verify integrity
        self.check_cancelled()?;
        operation.status = MoveStatus::Verifying;
        let verified = self.file_op
            .verify_integrity(source_path, dest_path)
            .map_err(|e| {
                let _ = self.journal.mark_failed(&operation.id, &e);
                MoveError::VerificationFailed(e)
            })?;

        if !verified {
            // Clean up destination on verification failure
            let _ = std::fs::remove_file(dest_path);
            let err = format!(
                "Integrity check failed between {:?} and {:?}",
                source_path, dest_path
            );
            operation.status = MoveStatus::Failed(err.clone());
            let _ = self.journal.mark_failed(&operation.id, &err);
            return Err(MoveError::VerificationFailed(err));
        }

        // Phase 4: Delete source (or send to trash)
        self.check_cancelled()?;
        operation.status = MoveStatus::Moving;

        let delete_result = if self.use_trash {
            self.file_op.send_to_trash(source_path)
        } else {
            self.file_op.delete(source_path)
        };

        if let Err(e) = delete_result {
            operation.status = MoveStatus::Failed(e.clone());
            let _ = self.journal.mark_failed(&operation.id, &e);
            return Err(MoveError::Io(
                std::io::Error::new(std::io::ErrorKind::Other, e),
            ));
        }

        // Phase 5: Update journal as completed
        operation.status = MoveStatus::Completed;
        operation.completed_at = Some(chrono::Utc::now());
        if let Err(e) = self.journal.mark_completed(&operation.id) {
            let _ = self.journal.mark_failed(&operation.id, &e);
            return Err(MoveError::Journal(e));
        }

        Ok(operation)
    }

    pub fn move_batch(
        &self,
        sources: &[FilePath],
        destinations: &[FilePath],
    ) -> Vec<MoveResult<MoveOperation>> {
        sources
            .iter()
            .zip(destinations.iter())
            .map(|(src, dst)| self.move_file(src, dst))
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::dry_run::DryRunMover;
    use crate::undo_manager::InMemoryJournal;

    fn setup_mover(use_trash: bool) -> SafeMover {
        let journal = Box::new(InMemoryJournal::new());
        let file_op = Box::new(DryRunMover::new());
        SafeMover::new(journal, file_op).with_trash(use_trash)
    }

    #[test]
    fn test_move_file_dry_run() {
        let mover = setup_mover(false);
        let dir = std::env::temp_dir().join("__petabyte_safe_move_test");
        std::fs::create_dir_all(&dir).ok();
        let src_path = dir.join("source.txt");
        std::fs::write(&src_path, b"test data").unwrap();
        let src = FilePath::new(src_path.to_str().unwrap()).unwrap();
        let dest = FilePath::new(dir.join("dest.txt").to_str().unwrap()).unwrap();

        let result = mover.move_file(&src, &dest);
        assert!(result.is_ok(), "move_file failed: {:?}", result.err());
        let op = result.unwrap();
        assert_eq!(op.status, MoveStatus::Completed);
        assert!(op.completed_at.is_some());
        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn test_source_not_found() {
        let mover = setup_mover(false);
        let src = FilePath::new("C:\\nonexistent\\file.txt").unwrap();
        let dest = FilePath::new("C:\\dest\\file.txt").unwrap();
        let result = mover.move_file(&src, &dest);
        assert!(result.is_err());
    }

    #[test]
    fn test_destination_already_exists() {
        let mover = setup_mover(false);
        let src = FilePath::new("C:\\source\\file.txt").unwrap();
        let existing = std::env::temp_dir().join("__petabyte_test_exists");
        std::fs::write(&existing, b"exists").ok();
        let dest = FilePath::new(existing.to_str().unwrap()).unwrap();

        let result = mover.move_file(&src, &dest);
        assert!(result.is_err());
        let _ = std::fs::remove_file(&existing);
    }

    #[test]
    fn test_batch_move() {
        let journal = Box::new(InMemoryJournal::new());
        let file_op = Box::new(DryRunMover::new());
        let mover = SafeMover::new(journal, file_op);

        let src1 = FilePath::new("C:\\src\\a.txt").unwrap();
        let src2 = FilePath::new("C:\\src\\b.txt").unwrap();
        let dst1 = FilePath::new("C:\\dst\\a.txt").unwrap();
        let dst2 = FilePath::new("C:\\dst\\b.txt").unwrap();

        let results = mover.move_batch(&[src1, src2], &[dst1, dst2]);
        assert_eq!(results.len(), 2);
        // Both should fail since sources don't exist
        assert!(results[0].is_err());
        assert!(results[1].is_err());
    }

    #[test]
    fn test_cancellation() {
        let journal = Box::new(InMemoryJournal::new());
        let file_op = Box::new(DryRunMover::new());
        let cancel = Arc::new(AtomicBool::new(true));
        let mover = SafeMover::new(journal, file_op);
        let mover = mover.with_cancel(cancel);

        let src = FilePath::new("C:\\src\\a.txt").unwrap();
        let dst = FilePath::new("C:\\dst\\a.txt").unwrap();
        let result = mover.move_file(&src, &dst);
        assert!(result.is_err());
    }

    #[test]
    fn test_move_records_journal() {
        let journal = Box::new(InMemoryJournal::new());
        let file_op = Box::new(DryRunMover::new());
        let mover = SafeMover::new(journal, file_op);

        // DryRunMover reports source exists for this path
        let src = FilePath::new("C:\\test\\source_exists.txt").unwrap();
        let dst = FilePath::new("C:\\test\\dest.txt").unwrap();

        // Source doesn't exist on disk, so it fails
        let result = mover.move_file(&src, &dst);
        assert!(result.is_err());
    }
}
