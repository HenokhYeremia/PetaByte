use std::collections::HashSet;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;

use parking_lot::Mutex;
use petabyte_shared_models::entities::FileEntry;

use crate::connection::ConnectionManager;
use crate::models::FileEntryRow;

pub struct BatchWriter {
    conn: Arc<ConnectionManager>,
    session_id: String,
    entries_received: AtomicU64,
    entries_inserted: AtomicU64,
    files_inserted: AtomicU64,
    dirs_inserted: AtomicU64,
    bytes_inserted: AtomicU64,
    errors: AtomicU64,
    batches: AtomicU64,
    seen_paths: Mutex<Option<HashSet<String>>>,
}

impl BatchWriter {
    pub fn new(conn: Arc<ConnectionManager>, session_id: String) -> Self {
        Self {
            conn,
            session_id,
            entries_received: AtomicU64::new(0),
            entries_inserted: AtomicU64::new(0),
            files_inserted: AtomicU64::new(0),
            dirs_inserted: AtomicU64::new(0),
            bytes_inserted: AtomicU64::new(0),
            errors: AtomicU64::new(0),
            batches: AtomicU64::new(0),
            seen_paths: Mutex::new(None),
        }
    }

    pub fn init_seen_paths(&self, paths: Vec<String>) {
        let mut seen = self.seen_paths.lock();
        let mut set = HashSet::with_capacity(paths.len());
        for p in paths {
            set.insert(p);
        }
        *seen = Some(set);
    }

    fn is_seen(&self, path: &str) -> bool {
        let seen = self.seen_paths.lock();
        match seen.as_ref() {
            Some(set) => set.contains(path),
            None => false,
        }
    }

    pub fn write_batch(&self, entries: &[FileEntry]) -> Result<u64, String> {
        let mut conn = self.conn.connection();
        let txn = conn
            .transaction()
            .map_err(|e| format!("Failed to begin transaction: {e}"))?;

        let sql = FileEntryRow::insert_sql();
        let mut inserted = 0u64;
        let mut files = 0u64;
        let mut dirs = 0u64;
        let mut bytes = 0u64;

        for entry in entries {
            let path_str = entry.file_path.to_string();

            if self.is_seen(&path_str) {
                continue;
            }

            let params = FileEntryRow::insert_params(&self.session_id, entry);
            let params_refs: Vec<&dyn rusqlite::types::ToSql> =
                params.iter().map(std::convert::AsRef::as_ref).collect();

            match txn.execute(sql, params_refs.as_slice()) {
                Ok(affected) => {
                    if affected > 0 {
                        inserted += 1;
                        if entry.is_directory {
                            dirs += 1;
                        } else {
                            files += 1;
                        }
                        bytes += entry.file_size;
                    }
                }
                Err(e) => {
                    log::warn!("DB insert failed for {path_str}: {e}");
                    self.errors.fetch_add(1, Ordering::Relaxed);
                }
            }
        }

        txn.commit()
            .map_err(|e| format!("Failed to commit transaction: {e}"))?;

        self.entries_received
            .fetch_add(entries.len() as u64, Ordering::Relaxed);
        self.entries_inserted.fetch_add(inserted, Ordering::Relaxed);
        self.files_inserted.fetch_add(files, Ordering::Relaxed);
        self.dirs_inserted.fetch_add(dirs, Ordering::Relaxed);
        self.bytes_inserted.fetch_add(bytes, Ordering::Relaxed);
        self.batches.fetch_add(1, Ordering::Relaxed);

        Ok(inserted)
    }

    pub fn entries_received(&self) -> u64 {
        self.entries_received.load(Ordering::Relaxed)
    }

    pub fn entries_inserted(&self) -> u64 {
        self.entries_inserted.load(Ordering::Relaxed)
    }

    pub fn files_inserted(&self) -> u64 {
        self.files_inserted.load(Ordering::Relaxed)
    }

    pub fn dirs_inserted(&self) -> u64 {
        self.dirs_inserted.load(Ordering::Relaxed)
    }

    pub fn bytes_inserted(&self) -> u64 {
        self.bytes_inserted.load(Ordering::Relaxed)
    }

    pub fn errors(&self) -> u64 {
        self.errors.load(Ordering::Relaxed)
    }

    pub fn batches(&self) -> u64 {
        self.batches.load(Ordering::Relaxed)
    }

    pub fn session_id(&self) -> &str {
        &self.session_id
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::connection::ConnectionManager;
    use crate::migrations;
    use crate::repositories::scan_repo::ScanRepositoryImpl;
    use petabyte_shared_models::entities::ScanSession;
    use petabyte_shared_models::ports::ScanRepository;
    use petabyte_shared_models::value_objects::FilePath;
    use std::sync::Arc;

    fn setup_with_session() -> (Arc<ConnectionManager>, BatchWriter, String) {
        let conn = Arc::new(ConnectionManager::open_in_memory().unwrap());
        migrations::run_all(&conn).unwrap();
        let session = ScanSession::new("/test");
        let repo: Arc<dyn ScanRepository> = Arc::new(ScanRepositoryImpl::new(conn.clone()));
        repo.create_session(&session).unwrap();
        let sid = session.session_id.clone();
        let bw = BatchWriter::new(conn.clone(), sid.clone());
        (conn, bw, sid)
    }

    fn make_entry(path: &str, size: u64, is_dir: bool) -> FileEntry {
        FileEntry::new(
            FilePath::new(path).unwrap(),
            if is_dir {
                None
            } else {
                FilePath::new("/parent").ok()
            },
            if is_dir {
                path.rsplit('/').next().unwrap_or("dir").into()
            } else {
                "file.txt".into()
            },
            if is_dir { None } else { Some("txt".into()) },
            size,
            is_dir,
            false,
            0o644,
            1_700_000_000,
            1,
        )
    }

    #[test]
    fn test_write_batch() {
        let (_, bw, _) = setup_with_session();
        let entries = vec![
            make_entry("/a/file1.txt", 100, false),
            make_entry("/a/file2.txt", 200, false),
            make_entry("/a/sub", 0, true),
        ];
        let inserted = bw.write_batch(&entries).unwrap();
        assert_eq!(inserted, 3);
        assert_eq!(bw.entries_received(), 3);
        assert_eq!(bw.entries_inserted(), 3);
        assert_eq!(bw.files_inserted(), 2);
        assert_eq!(bw.dirs_inserted(), 1);
        assert_eq!(bw.bytes_inserted(), 300);
    }

    #[test]
    fn test_dedup_same_session() {
        let (_, bw, _) = setup_with_session();
        let e1 = vec![make_entry("/a/dup.txt", 100, false)];
        let e2 = vec![make_entry("/a/dup.txt", 200, false)];
        assert_eq!(bw.write_batch(&e1).unwrap(), 1);
        assert_eq!(bw.write_batch(&e2).unwrap(), 0);
        assert_eq!(bw.entries_received(), 2);
        assert_eq!(bw.entries_inserted(), 1);
    }

    #[test]
    fn test_seen_paths_skip() {
        let (_, bw, _) = setup_with_session();
        bw.init_seen_paths(vec!["/a/existing.txt".into()]);
        let entries = vec![
            make_entry("/a/existing.txt", 100, false),
            make_entry("/a/new.txt", 200, false),
        ];
        let inserted = bw.write_batch(&entries).unwrap();
        assert_eq!(inserted, 1);
        assert_eq!(bw.entries_inserted(), 1);
    }

    #[test]
    fn test_empty_batch() {
        let (_, bw, _) = setup_with_session();
        let inserted = bw.write_batch(&[]).unwrap();
        assert_eq!(inserted, 0);
    }
}
