use std::sync::atomic::AtomicBool;
use std::sync::Arc;

use chrono::Utc;
use petabyte_shared_models::entities::{FileEntry, ScanSession, ScanStatus};
use petabyte_shared_models::ports::{
    FileRepository, ProgressEmitter, ProgressPayload, ScanBatchHandler, ScanRepository, ScanResult,
};

use crate::dto::{ScanConfig, ScanResultDto};
use crate::error::EngineError;

pub type ScanFunction =
    Arc<dyn Fn(Arc<dyn ScanBatchHandler>, &AtomicBool) -> Result<ScanResult, String> + Send + Sync>;

pub struct ScanDriveUseCase {
    file_repo: Arc<dyn FileRepository>,
    scan_repo: Arc<dyn ScanRepository>,
    progress: Arc<dyn ProgressEmitter>,
}

impl ScanDriveUseCase {
    pub fn new(
        file_repo: Arc<dyn FileRepository>,
        scan_repo: Arc<dyn ScanRepository>,
        progress: Arc<dyn ProgressEmitter>,
    ) -> Self {
        Self {
            file_repo,
            scan_repo,
            progress,
        }
    }

    pub fn execute(
        &self,
        config: &ScanConfig,
        scanner: ScanFunction,
        cancel: &AtomicBool,
    ) -> Result<ScanResultDto, EngineError> {
        config.validate()?;

        let mut session = ScanSession::new(&config.root_path);
        self.scan_repo
            .create_session(&session)
            .map_err(EngineError::Port)?;

        let session_id = session.session_id.clone();
        let handler = Arc::new(ScanBatchHandlerImpl {
            file_repo: self.file_repo.clone(),
            progress: self.progress.clone(),
            session_id: session_id.clone(),
        });

        let result = scanner(handler, cancel).map_err(EngineError::Port)?;

        session.status = ScanStatus::Completed;
        session.total_files = result.total_files;
        session.total_dirs = result.total_dirs;
        session.total_size = result.total_size;
        session.total_errors = result.total_errors;
        session.completed_at = Some(Utc::now());
        self.scan_repo
            .update_session(&session)
            .map_err(EngineError::Port)?;

        Ok(ScanResultDto {
            session_id: result.session_id,
            total_files: result.total_files,
            total_dirs: result.total_dirs,
            total_size: result.total_size,
            total_errors: result.total_errors,
            elapsed_ms: result.elapsed_ms,
            status: "completed".into(),
        })
    }
}

struct ScanBatchHandlerImpl {
    file_repo: Arc<dyn FileRepository>,
    progress: Arc<dyn ProgressEmitter>,
    #[allow(dead_code)]
    session_id: String,
}

impl ScanBatchHandler for ScanBatchHandlerImpl {
    fn handle_batch(&self, entries: &[FileEntry]) -> Result<(), String> {
        self.file_repo.insert_batch(entries)?;
        let file_count = entries.iter().filter(|e| !e.is_directory).count() as u64;
        let dir_count = entries.iter().filter(|e| e.is_directory).count() as u64;
        let size: u64 = entries.iter().map(|e| e.file_size).sum();
        self.progress.on_progress(&ProgressPayload {
            scanned_files: file_count,
            scanned_dirs: dir_count,
            scanned_size: size,
            error_count: 0,
            elapsed_secs: 0,
            status: "scanning".into(),
        });
        Ok(())
    }

    fn handle_complete(&self, result: &ScanResult) -> Result<(), String> {
        self.progress.on_progress(&ProgressPayload {
            scanned_files: result.total_files,
            scanned_dirs: result.total_dirs,
            scanned_size: result.total_size,
            error_count: result.total_errors,
            elapsed_secs: result.elapsed_ms / 1000,
            status: "completed".into(),
        });
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::AtomicBool;

    struct MockFileRepo;
    impl FileRepository for MockFileRepo {
        fn insert_batch(&self, _entries: &[FileEntry]) -> Result<(), String> {
            Ok(())
        }
        fn get_entry_count(&self) -> Result<u64, String> {
            Ok(0)
        }
    }

    struct MockScanRepo {
        session: std::sync::Mutex<Option<ScanSession>>,
    }
    impl ScanRepository for MockScanRepo {
        fn create_session(&self, session: &ScanSession) -> Result<(), String> {
            *self.session.lock().unwrap() = Some(session.clone());
            Ok(())
        }
        fn update_session(&self, session: &ScanSession) -> Result<(), String> {
            *self.session.lock().unwrap() = Some(session.clone());
            Ok(())
        }
        fn get_session(&self, _session_id: &str) -> Result<Option<ScanSession>, String> {
            Ok(self.session.lock().unwrap().clone())
        }
        fn get_active_session(&self, _root_path: &str) -> Result<Option<ScanSession>, String> {
            Ok(None)
        }
        fn list_sessions(&self) -> Result<Vec<ScanSession>, String> {
            Ok(vec![])
        }
        fn delete_session(&self, _session_id: &str) -> Result<(), String> {
            Ok(())
        }
    }

    struct MockProgress;
    impl ProgressEmitter for MockProgress {
        fn on_progress(&self, _payload: &ProgressPayload) {}
        fn on_error(&self, _message: &str) {}
    }

    #[test]
    fn test_scan_execute_success() {
        let use_case = ScanDriveUseCase::new(
            Arc::new(MockFileRepo),
            Arc::new(MockScanRepo {
                session: std::sync::Mutex::new(None),
            }),
            Arc::new(MockProgress),
        );

        let config = ScanConfig::new("C:\\");
        let cancel = AtomicBool::new(false);

        let scanner: ScanFunction = Arc::new(|handler, _cancel| {
            handler.handle_batch(&[])?;
            handler.handle_complete(&ScanResult {
                session_id: "test".into(),
                total_files: 10,
                total_dirs: 5,
                total_size: 1000,
                total_errors: 0,
                elapsed_ms: 100,
            })?;
            Ok(ScanResult {
                session_id: "test".into(),
                total_files: 10,
                total_dirs: 5,
                total_size: 1000,
                total_errors: 0,
                elapsed_ms: 100,
            })
        });

        let result = use_case.execute(&config, scanner, &cancel).unwrap();
        assert_eq!(result.total_files, 10);
        assert_eq!(result.total_dirs, 5);
    }

    #[test]
    fn test_scan_cancelled() {
        let use_case = ScanDriveUseCase::new(
            Arc::new(MockFileRepo),
            Arc::new(MockScanRepo {
                session: std::sync::Mutex::new(None),
            }),
            Arc::new(MockProgress),
        );

        let config = ScanConfig::new("C:\\");
        let cancel = AtomicBool::new(true);

        let scanner: ScanFunction = Arc::new(|_handler, cancel| {
            if cancel.load(std::sync::atomic::Ordering::Relaxed) {
                return Err("cancelled".into());
            }
            unreachable!()
        });

        let result = use_case.execute(&config, scanner, &cancel);
        assert!(result.is_err());
    }
}
