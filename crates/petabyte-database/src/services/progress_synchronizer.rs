use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;

use petabyte_shared_models::ports::ProgressEmitter;

use crate::error::DatabaseError;

use super::batch_writer::BatchWriter;
use super::session_manager::SessionManager;

pub struct ProgressSynchronizer {
    batch_writer: Arc<BatchWriter>,
    session_manager: Arc<SessionManager>,
    emitter: Option<Arc<dyn ProgressEmitter>>,
    sync_interval: u64,
    last_sync_files: AtomicU64,
}

impl ProgressSynchronizer {
    pub fn new(
        batch_writer: Arc<BatchWriter>,
        session_manager: Arc<SessionManager>,
        emitter: Option<Arc<dyn ProgressEmitter>>,
        sync_interval: u64,
    ) -> Self {
        Self {
            batch_writer,
            session_manager,
            emitter,
            sync_interval,
            last_sync_files: AtomicU64::new(0),
        }
    }

    pub fn maybe_sync(&self) -> Result<(), DatabaseError> {
        let files = self.batch_writer.entries_received();
        let last = self.last_sync_files.load(Ordering::Relaxed);

        if files - last < self.sync_interval {
            return Ok(());
        }

        self.force_sync()
    }

    pub fn force_sync(&self) -> Result<(), DatabaseError> {
        let files = self.batch_writer.files_inserted();
        let dirs = self.batch_writer.dirs_inserted();
        let bytes = self.batch_writer.bytes_inserted();
        let errors = self.batch_writer.errors();

        self.session_manager
            .checkpoint(files, dirs, bytes, errors)
            .map_err(DatabaseError::Session)?;

        self.last_sync_files
            .store(self.batch_writer.entries_received(), Ordering::Relaxed);

        if let Some(ref emitter) = self.emitter {
            let elapsed = self.session_manager.session().elapsed_seconds() as u64;
            let payload = petabyte_shared_models::ports::ProgressPayload {
                scanned_files: files,
                scanned_dirs: dirs,
                scanned_size: bytes,
                error_count: errors,
                elapsed_secs: elapsed,
                status: "scanning".into(),
            };
            emitter.on_progress(&payload);
        }

        Ok(())
    }

    pub fn emit_error(&self, message: &str) {
        if let Some(ref emitter) = self.emitter {
            emitter.on_error(message);
        }
        log::error!("Scan error: {message}");
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::connection::ConnectionManager;
    use crate::migrations;
    use crate::repositories::scan_repo::ScanRepositoryImpl;
    use parking_lot::Mutex;
    use petabyte_shared_models::entities::ScanSession;
    use petabyte_shared_models::ports::{ProgressEmitter, ProgressPayload, ScanRepository};
    use petabyte_shared_models::value_objects::FilePath;
    use std::sync::Arc;

    struct TestEmitter {
        progress: Mutex<Vec<ProgressPayload>>,
    }

    impl ProgressEmitter for TestEmitter {
        fn on_progress(&self, payload: &ProgressPayload) {
            self.progress.lock().push(payload.clone());
        }
        fn on_error(&self, _message: &str) {}
    }

    fn setup() -> (Arc<BatchWriter>, ProgressSynchronizer, Arc<TestEmitter>) {
        let conn = Arc::new(ConnectionManager::open_in_memory().unwrap());
        migrations::run_all(&conn).unwrap();
        let repo: Arc<dyn ScanRepository> = Arc::new(ScanRepositoryImpl::new(conn.clone()));
        let session = ScanSession::new("/test");
        repo.create_session(&session).unwrap();
        let sid = session.session_id.clone();
        let sm = Arc::new(SessionManager::new(repo, session));
        let bw = Arc::new(BatchWriter::new(conn, sid));
        let emitter = Arc::new(TestEmitter {
            progress: Mutex::new(Vec::new()),
        });
        let ps = ProgressSynchronizer::new(bw.clone(), sm, Some(emitter.clone()), 5);
        (bw, ps, emitter)
    }

    #[test]
    fn test_sync_skips_below_threshold() {
        let (_, ps, _) = setup();
        assert!(ps.maybe_sync().is_ok());
    }

    #[test]
    fn test_force_sync_updates_session() {
        let (bw, ps, _) = setup();
        let entry = petabyte_shared_models::entities::FileEntry::new(
            FilePath::new("/a/b.txt").unwrap(),
            None,
            "b.txt".into(),
            Some("txt".into()),
            100,
            false,
            false,
            0o644,
            1_700_000_000,
            1,
        );
        bw.write_batch(&[entry]).unwrap();
        ps.force_sync().unwrap();

        let session = ps.session_manager.session();
        assert_eq!(session.total_files, 1);
    }

    #[test]
    fn test_emitter_called_on_force_sync() {
        let (bw, ps, emitter) = setup();
        for i in 0..10 {
            let entry = petabyte_shared_models::entities::FileEntry::new(
                FilePath::new(format!("/a/{i}.txt")).unwrap(),
                None,
                format!("{i}.txt"),
                Some("txt".into()),
                100,
                false,
                false,
                0o644,
                1_700_000_000,
                1,
            );
            bw.write_batch(&[entry]).unwrap();
        }
        ps.force_sync().unwrap();
        let updates = emitter.progress.lock();
        assert_eq!(updates.len(), 1);
        assert_eq!(updates[0].scanned_files, 10);
    }
}
