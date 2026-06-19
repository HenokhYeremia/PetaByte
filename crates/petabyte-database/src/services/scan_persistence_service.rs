use std::sync::Arc;

use petabyte_scanner::{Scanner, ScannerConfig, ScannerError};
use petabyte_shared_models::entities::FileEntry;
use petabyte_shared_models::ports::{ProgressEmitter, ProgressPayload, ScanRepository, ScanResult};

use crate::connection::ConnectionManager;
use crate::error::DatabaseError;
use crate::migrations;
use crate::repositories::file_repo::FileRepositoryImpl;
use crate::repositories::scan_repo::ScanRepositoryImpl;

use super::batch_writer::BatchWriter;
use super::progress_synchronizer::ProgressSynchronizer;
use super::session_manager::SessionManager;

const DEFAULT_SYNC_INTERVAL: u64 = 5_000;

pub struct ScanPersistenceService {
    #[allow(dead_code)]
    conn: Arc<ConnectionManager>,
    scanner: Scanner,
    batch_writer: Arc<BatchWriter>,
    session_manager: Arc<SessionManager>,
    progress_sync: Arc<ProgressSynchronizer>,
}

impl ScanPersistenceService {
    pub fn new(db_path: &str, config: ScannerConfig) -> Result<Self, DatabaseError> {
        let conn = Arc::new(ConnectionManager::open(db_path)?);
        migrations::run_all(&conn)?;

        let scan_repo: Arc<dyn ScanRepository> =
            Arc::new(ScanRepositoryImpl::new(conn.clone()));

        let session = petabyte_shared_models::entities::ScanSession::new(&config.root_path);
        scan_repo
            .create_session(&session)
            .map_err(|e| DatabaseError::Session(e))?;

        let session_id = session.session_id.clone();
        let session_manager = Arc::new(SessionManager::new(scan_repo, session));
        let batch_writer = Arc::new(BatchWriter::new(conn.clone(), session_id));
        let progress_sync = Arc::new(ProgressSynchronizer::new(
            batch_writer.clone(),
            session_manager.clone(),
            None,
            DEFAULT_SYNC_INTERVAL,
        ));

        let scanner =
            Scanner::new(config).map_err(|e| DatabaseError::Connection(e.to_string()))?;

        Ok(Self {
            conn,
            scanner,
            batch_writer,
            session_manager,
            progress_sync,
        })
    }

    /// Resume from a previous incomplete scan session.
    pub fn resume(
        db_path: &str,
        config: ScannerConfig,
        session_id: &str,
    ) -> Result<Self, DatabaseError> {
        let conn = Arc::new(ConnectionManager::open(db_path)?);
        migrations::run_all(&conn)?;

        let scan_repo: Arc<dyn ScanRepository> =
            Arc::new(ScanRepositoryImpl::new(conn.clone()));

        let existing = scan_repo
            .get_session(session_id)
            .map_err(|e| DatabaseError::Session(e))?
            .ok_or_else(|| {
                DatabaseError::Resume(format!("Session {} not found", session_id))
            })?;

        if existing.status.is_terminal() {
            return Err(DatabaseError::Resume(format!(
                "Session {} is already in terminal state {:?}",
                session_id,
                existing.status
            )));
        }

        let file_repo = FileRepositoryImpl::new(conn.clone());
        let existing_paths = file_repo
            .get_file_paths_for_session(session_id)
            .map_err(|e| DatabaseError::Session(e))?;

        log::info!(
            "Resuming session {} with {} existing paths",
            session_id,
            existing_paths.len()
        );

        let session_manager = Arc::new(SessionManager::new(scan_repo, existing));
        let batch_writer =
            Arc::new(BatchWriter::new(conn.clone(), session_id.to_string()));
        batch_writer.init_seen_paths(existing_paths);

        let progress_sync = Arc::new(ProgressSynchronizer::new(
            batch_writer.clone(),
            session_manager.clone(),
            None,
            DEFAULT_SYNC_INTERVAL,
        ));

        let scanner =
            Scanner::new(config).map_err(|e| DatabaseError::Connection(e.to_string()))?;

        Ok(Self {
            conn,
            scanner,
            batch_writer,
            session_manager,
            progress_sync,
        })
    }

    /// Run the scan with optional progress emitter.
    /// Blocks until the scan completes, is cancelled, or fails.
    pub fn run(
        &self,
        emitter: Option<Arc<dyn ProgressEmitter>>,
    ) -> Result<ScanResult, ScannerError> {
        self.session_manager
            .start()
            .map_err(|e| ScannerError::Handler(e))?;

        let progress_sync = if emitter.is_some() {
            Arc::new(ProgressSynchronizer::new(
                self.batch_writer.clone(),
                self.session_manager.clone(),
                emitter,
                DEFAULT_SYNC_INTERVAL,
            ))
        } else {
            self.progress_sync.clone()
        };

        let bw = self.batch_writer.clone();
        let ps = progress_sync.clone();

        let handler = Arc::new(move |batch: Vec<FileEntry>| -> Result<(), String> {
            bw.write_batch(&batch)?;
            let _ = ps.maybe_sync();
            Ok(())
        });

        match self.scanner.run(handler) {
            Ok(mut result) => {
                progress_sync.force_sync().ok();
                let session = self
                    .session_manager
                    .complete()
                    .map_err(|e| ScannerError::Handler(e))?;
                result.session_id = session.session_id;
                result.total_files = session.total_files;
                result.total_dirs = session.total_dirs;
                result.total_size = session.total_size;
                result.total_errors = session.total_errors;
                Ok(result)
            }
            Err(ScannerError::Cancelled) => {
                progress_sync.force_sync().ok();
                self.session_manager.cancel().ok();
                Err(ScannerError::Cancelled)
            }
            Err(e) => {
                progress_sync.force_sync().ok();
                self.session_manager.fail().ok();
                Err(e)
            }
        }
    }

    pub fn cancel(&self) {
        self.scanner.cancel();
    }

    pub fn pause(&self) {
        self.scanner.pause();
    }

    pub fn resume_scan(&self) {
        self.scanner.resume();
    }

    pub fn status(&self) -> &'static str {
        self.scanner.status()
    }

    pub fn session(&self) -> petabyte_shared_models::entities::ScanSession {
        self.session_manager.session()
    }

    pub fn progress(&self) -> ProgressPayload {
        ProgressPayload {
            scanned_files: self.batch_writer.files_inserted(),
            scanned_dirs: self.batch_writer.dirs_inserted(),
            scanned_size: self.batch_writer.bytes_inserted(),
            error_count: self.batch_writer.errors(),
            elapsed_secs: self.session_manager.session().elapsed_seconds() as u64,
            status: self.scanner.status().into(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use parking_lot::Mutex;
    use petabyte_shared_models::entities::ScanStatus;
    use std::sync::Arc;
    use tempfile::TempDir;

    struct TestEmitter {
        progress: Mutex<Vec<ProgressPayload>>,
    }

    impl ProgressEmitter for TestEmitter {
        fn on_progress(&self, payload: &ProgressPayload) {
            self.progress.lock().push(payload.clone());
        }
        fn on_error(&self, _message: &str) {}
    }

    fn create_test_dir() -> TempDir {
        let dir = tempfile::tempdir().unwrap();
        for i in 0..3 {
            let sub = dir.path().join(format!("sub_{}", i));
            std::fs::create_dir_all(&sub).unwrap();
            for j in 0..5 {
                std::fs::write(
                    sub.join(format!("file_{}.txt", j)),
                    format!("content_{}", j),
                )
                .unwrap();
            }
        }
        dir
    }

    fn make_config(root: &str) -> ScannerConfig {
        ScannerConfig {
            exclude_hidden: false,
            batch_size: 10,
            ..ScannerConfig::new(root)
        }
    }

    #[test]
    fn test_full_scan_lifecycle() {
        let dir = create_test_dir();
        let db = TempDir::new().unwrap();
        let db_path = db.path().join("test.db").to_string_lossy().to_string();
        let root = dir.path().to_string_lossy().to_string();

        let service = ScanPersistenceService::new(&db_path, make_config(&root)).unwrap();
        let result = service.run(None);

        assert!(result.is_ok(), "Scan should succeed: {:?}", result.err());
        let result = result.unwrap();
        assert_eq!(
            result.total_files, 15,
            "Should find 15 files (3 dirs × 5 files)"
        );
        assert_eq!(
            result.total_dirs, 4,
            "Should find 4 dirs (root + 3 subdirs)"
        );
        assert_eq!(result.total_errors, 0, "Should have 0 errors");
        assert!(result.elapsed_ms > 0);
        assert!(!result.session_id.is_empty());
        assert_eq!(service.status(), "completed");

        let session = service.session();
        assert_eq!(session.status, ScanStatus::Completed);
        assert_eq!(session.total_files, 15);
    }

    #[test]
    fn test_cancel_scan() {
        let dir = create_test_dir();
        let db = TempDir::new().unwrap();
        let db_path = db.path().join("cancel.db").to_string_lossy().to_string();
        let root = dir.path().to_string_lossy().to_string();

        let service =
            ScanPersistenceService::new(&db_path, make_config(&root)).unwrap();

        service.cancel();
        let result = service.run(None);

        match result {
            Err(ScannerError::Cancelled) => {}
            other => panic!("Expected Cancelled, got: {:?}", other),
        }
        assert_eq!(service.status(), "cancelled");
    }

    #[test]
    fn test_progress_emitter() {
        let dir = create_test_dir();
        let db = TempDir::new().unwrap();
        let db_path = db.path().join("progress.db").to_string_lossy().to_string();
        let root = dir.path().to_string_lossy().to_string();

        let service =
            ScanPersistenceService::new(&db_path, make_config(&root)).unwrap();
        let emitter = Arc::new(TestEmitter {
            progress: Mutex::new(Vec::new()),
        });

        let result = service.run(Some(emitter.clone()));
        assert!(result.is_ok());

        let updates = emitter.progress.lock();
        assert!(!updates.is_empty(), "Should have progress updates");
        if let Some(last) = updates.last() {
            assert_eq!(last.scanned_files, 15);
            assert_eq!(last.status, "scanning");
        }
    }

    #[test]
    fn test_resume_scan() {
        let dir = create_test_dir();
        let db = TempDir::new().unwrap();
        let db_path = db.path().join("resume.db").to_string_lossy().to_string();
        let root = dir.path().to_string_lossy().to_string();

        let service =
            ScanPersistenceService::new(&db_path, make_config(&root)).unwrap();
        let session_id = service.session().session_id.clone();

        // Simulate partial scan by writing some entries directly
        let conn = ConnectionManager::open(&db_path).unwrap();
        migrations::run_all(&conn).unwrap();
        let f_repo = FileRepositoryImpl::new(Arc::new(conn));

        use petabyte_shared_models::value_objects::FilePath;
        let partial = vec![FileEntry::new(
            FilePath::new("/fake/partial.txt").unwrap(),
            None,
            "partial.txt".into(),
            Some("txt".into()),
            100,
            false,
            false,
            0o644,
            1_700_000_000,
            1,
        )];
        f_repo
            .insert_batch_with_session(&session_id, &partial)
            .unwrap();

        // Resume
        let resumed = ScanPersistenceService::resume(
            &db_path,
            make_config(&root),
            &session_id,
        )
        .unwrap();

        assert_eq!(resumed.session().session_id, session_id);
        assert_eq!(resumed.session().status, ScanStatus::Pending);

        let result = resumed.run(None);
        assert!(
            result.is_ok(),
            "Resume scan should succeed: {:?}",
            result.err()
        );
        let result = result.unwrap();

        // Should find all 15 files (partial skipped via seen_paths)
        assert_eq!(result.total_files, 15);
        assert_eq!(result.total_dirs, 4);
    }

    #[test]
    fn test_progress_query() {
        let dir = create_test_dir();
        let db = TempDir::new().unwrap();
        let db_path = db.path().join("prog.db").to_string_lossy().to_string();
        let root = dir.path().to_string_lossy().to_string();

        let service =
            ScanPersistenceService::new(&db_path, make_config(&root)).unwrap();

        let progress = service.progress();
        assert_eq!(progress.status, "idle");

        service.run(None).unwrap();

        let progress = service.progress();
        assert_eq!(progress.scanned_files, 15);
    }

    #[test]
    fn test_scan_persists_to_db() {
        let dir = create_test_dir();
        let db = TempDir::new().unwrap();
        let db_path = db.path().join("persist.db").to_string_lossy().to_string();
        let root = dir.path().to_string_lossy().to_string();

        let service =
            ScanPersistenceService::new(&db_path, make_config(&root)).unwrap();
        service.run(None).unwrap();

        // Verify data persisted by opening a new connection and checking counts
        use petabyte_shared_models::ports::FileRepository;
        let conn = ConnectionManager::open(&db_path).unwrap();
        let f_repo = FileRepositoryImpl::new(Arc::new(conn));
        let count = f_repo.get_entry_count().unwrap();
        // 15 files + 4 dirs = 19 total entries
        assert_eq!(count, 19, "Should have 19 total entries in DB");

        // Verify session stored correctly
        let scan_repo: Arc<dyn ScanRepository> =
            Arc::new(ScanRepositoryImpl::new(Arc::new(
                ConnectionManager::open(&db_path).unwrap(),
            )));
        let sessions = scan_repo.list_sessions().unwrap();
        assert_eq!(sessions.len(), 1);
        assert_eq!(sessions[0].status, ScanStatus::Completed);
        assert_eq!(sessions[0].total_files, 15);
        assert_eq!(sessions[0].total_dirs, 4);
    }
}
