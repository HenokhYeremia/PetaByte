use std::sync::atomic::{AtomicBool, AtomicU8, Ordering};
use std::sync::Arc;
use std::time::Instant;

use jwalk::{DirEntry, WalkDir};
use parking_lot::{Condvar, Mutex};

use petabyte_shared_models::entities::FileEntry;
use petabyte_shared_models::ports::ScanResult;

use crate::checkpoint::Checkpoint;
use crate::config::ScannerConfig;
use crate::entry_mapper;
use crate::error::ScannerError;
use crate::filter_rules::FilterRules;
use crate::permission_handler::PermissionHandler;

const STATUS_IDLE: u8 = 0;
const STATUS_RUNNING: u8 = 1;
const STATUS_PAUSED: u8 = 2;
const STATUS_CANCELLED: u8 = 3;
const STATUS_COMPLETED: u8 = 4;

type JEntry = DirEntry<((), ())>;

pub struct Scanner {
    config: Arc<ScannerConfig>,
    status: Arc<AtomicU8>,
    cancel_flag: Arc<AtomicBool>,
    pause_pair: Arc<(Mutex<bool>, Condvar)>,
}

impl Scanner {
    pub fn new(config: ScannerConfig) -> Result<Self, ScannerError> {
        config.validate()?;
        Ok(Self {
            config: Arc::new(config),
            status: Arc::new(AtomicU8::new(STATUS_IDLE)),
            cancel_flag: Arc::new(AtomicBool::new(false)),
            pause_pair: Arc::new((Mutex::new(false), Condvar::new())),
        })
    }

    pub fn run<H>(&self, handler: Arc<H>) -> Result<ScanResult, ScannerError>
    where
        H: Fn(Vec<FileEntry>) -> Result<(), String> + Send + Sync + 'static,
    {
        let prev = self
            .status
            .compare_exchange(
                STATUS_IDLE,
                STATUS_RUNNING,
                Ordering::SeqCst,
                Ordering::SeqCst,
            )
            .unwrap_or(STATUS_IDLE);
        if prev != STATUS_IDLE {
            return Err(ScannerError::InvalidConfig(
                "Scanner is already running or finished".into(),
            ));
        }

        let start = Instant::now();
        let root_path_buf = std::path::PathBuf::from(&self.config.root_path);

        let filter = FilterRules::new(&self.config);
        let permission_handler = PermissionHandler::default();
        let mut checkpoint = Checkpoint::new(self.config.checkpoint_interval);

        let mut batch: Vec<FileEntry> = Vec::with_capacity(self.config.batch_size);

        for result in WalkDir::new(&root_path_buf) {
            if self.cancel_flag.load(Ordering::Relaxed) {
                self.status.store(STATUS_CANCELLED, Ordering::Release);
                return Err(ScannerError::Cancelled);
            }

            {
                let (lock, cv) = &*self.pause_pair;
                let mut paused = lock.lock();
                while *paused {
                    self.status.store(STATUS_PAUSED, Ordering::Release);
                    cv.wait(&mut paused);
                    self.status.store(STATUS_RUNNING, Ordering::Release);
                }
            }

            let dir_entry: JEntry = match result {
                Ok(entry) => entry,
                Err(e) => {
                    let path = e
                        .path()
                        .map_or_else(|| "<unknown>".into(), |p| p.to_string_lossy().to_string());
                    let _ = permission_handler.handle_permission_denied(&path);
                    checkpoint.errors += 1;
                    continue;
                }
            };

            let path_str = dir_entry.path().to_string_lossy().to_string();
            let depth = dir_entry.depth as u32;
            let is_dir = dir_entry.file_type.is_dir();
            let is_symlink = dir_entry.file_type.is_symlink();

            if is_symlink && !self.config.follow_symlinks {
                continue;
            }

            let file_size = if is_dir {
                0u64
            } else if let Ok(m) = std::fs::metadata(&*dir_entry.path()) {
                m.len()
            } else {
                checkpoint.errors += 1;
                continue;
            };

            if !filter.should_include(&path_str, is_dir, file_size, depth) {
                continue;
            }

            if let Some(file_entry) =
                entry_mapper::map_dir_entry(&dir_entry, &self.config.root_path)
            {
                if file_entry.is_directory {
                    checkpoint.dirs_processed += 1;
                } else {
                    checkpoint.files_processed += 1;
                    checkpoint.bytes_processed += file_entry.file_size;
                }
                batch.push(file_entry);
            }

            if batch.len() >= self.config.batch_size {
                let entries = std::mem::take(&mut batch);
                (handler)(entries).map_err(ScannerError::Handler)?;
            }

            if checkpoint.should_checkpoint() {
                log::debug!(
                    "Checkpoint: {} files, {} dirs, {} errors",
                    checkpoint.files_processed,
                    checkpoint.dirs_processed,
                    checkpoint.errors
                );
                checkpoint.mark_checkpoint();
            }
        }

        if !batch.is_empty() {
            let entries = std::mem::take(&mut batch);
            (handler)(entries).map_err(ScannerError::Handler)?;
        }

        self.status.store(STATUS_COMPLETED, Ordering::Release);
        let elapsed = start.elapsed();

        Ok(ScanResult {
            session_id: String::new(),
            total_files: checkpoint.files_processed,
            total_dirs: checkpoint.dirs_processed,
            total_size: checkpoint.bytes_processed,
            total_errors: checkpoint.errors,
            elapsed_ms: elapsed.as_millis() as u64,
        })
    }

    pub fn pause(&self) {
        let (lock, _cv) = &*self.pause_pair;
        let mut paused = lock.lock();
        *paused = true;
        self.status.store(STATUS_PAUSED, Ordering::Release);
        drop(paused);
    }

    pub fn resume(&self) {
        let (lock, cv) = &*self.pause_pair;
        let mut paused = lock.lock();
        *paused = false;
        self.status.store(STATUS_RUNNING, Ordering::Release);
        cv.notify_all();
        drop(paused);
    }

    pub fn cancel(&self) {
        self.cancel_flag.store(true, Ordering::Relaxed);
        self.resume();
    }

    #[must_use]
    pub fn status(&self) -> &'static str {
        match self.status.load(Ordering::Acquire) {
            STATUS_IDLE => "idle",
            STATUS_RUNNING => "scanning",
            STATUS_PAUSED => "paused",
            STATUS_CANCELLED => "cancelled",
            STATUS_COMPLETED => "completed",
            _ => "unknown",
        }
    }

    pub fn reset(&self) {
        self.status.store(STATUS_IDLE, Ordering::Release);
        self.cancel_flag.store(false, Ordering::Relaxed);
        let (lock, cv) = &*self.pause_pair;
        let mut paused = lock.lock();
        *paused = false;
        cv.notify_all();
    }

    #[must_use]
    pub fn config(&self) -> &ScannerConfig {
        &self.config
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex as StdMutex;

    fn create_test_dir(_base: &str) -> tempfile::TempDir {
        let dir = tempfile::tempdir().unwrap();
        let _ = std::fs::create_dir_all(dir.path().join("sub1"));
        let _ = std::fs::create_dir_all(dir.path().join("sub2"));
        let _ = std::fs::create_dir_all(dir.path().join("sub1").join("nested"));

        std::fs::write(dir.path().join("file1.txt"), b"content1").unwrap();
        std::fs::write(dir.path().join("file2.rs"), b"fn main() {}").unwrap();
        std::fs::write(dir.path().join("sub1").join("file3.png"), b"pngdata").unwrap();
        std::fs::write(
            dir.path().join("sub1").join("nested").join("deep.txt"),
            b"deep",
        )
        .unwrap();

        dir
    }

    #[test]
    fn test_scanner_basic_scan() {
        let dir = create_test_dir("scanner_basic");
        let root = dir.path().to_string_lossy().to_string();
        let config = ScannerConfig::new(&root);
        let scanner = Scanner::new(config).unwrap();

        let all_entries = Arc::new(StdMutex::new(Vec::new()));
        let ae = all_entries.clone();
        let handler = Arc::new(move |batch: Vec<FileEntry>| {
            let mut r = ae.lock().unwrap();
            r.extend(batch);
            Ok(())
        });

        let scan_result = scanner.run(handler).unwrap();
        let entries = all_entries.lock().unwrap();

        assert_eq!(scan_result.total_files, 4, "Should find 4 files");
        assert_eq!(
            scan_result.total_dirs, 4,
            "Should find 4 dirs (root, sub1, sub2, nested)"
        );
        assert_eq!(
            entries.len(),
            8,
            "Should have 8 total entries (4 files + 4 dirs)"
        );
    }

    #[test]
    fn test_scanner_cancel() {
        let dir = create_test_dir("scanner_cancel");
        let root = dir.path().to_string_lossy().to_string();
        let config = ScannerConfig::new(&root);
        let scanner = Scanner::new(config).unwrap();

        let handler = Arc::new(|batch: Vec<FileEntry>| {
            let _ = batch;
            Ok(())
        });

        scanner.cancel();
        let result = scanner.run(handler);

        match result {
            Err(ScannerError::Cancelled) => {}
            other => panic!("Expected Cancelled, got: {other:?}"),
        }
    }

    #[test]
    fn test_scanner_reset() {
        let dir = create_test_dir("scanner_reset");
        let root = dir.path().to_string_lossy().to_string();
        let config = ScannerConfig::new(&root);
        let scanner = Scanner::new(config).unwrap();

        scanner.cancel();
        scanner.reset();

        let all_entries = Arc::new(StdMutex::new(Vec::new()));
        let ae = all_entries.clone();
        let handler = Arc::new(move |batch: Vec<FileEntry>| {
            let mut r = ae.lock().unwrap();
            r.extend(batch);
            Ok(())
        });

        let result = scanner.run(handler);
        assert!(result.is_ok(), "Reset scanner should run successfully");
        let entries = all_entries.lock().unwrap();
        assert_eq!(entries.len(), 8);
    }

    #[test]
    fn test_scanner_exclude_pattern() {
        let dir = create_test_dir("scanner_exclude");
        let root = dir.path().to_string_lossy().to_string();
        let config = ScannerConfig {
            exclude_patterns: vec!["*.rs".into()],
            ..ScannerConfig::new(&root)
        };
        let scanner = Scanner::new(config).unwrap();

        let all_entries = Arc::new(StdMutex::new(Vec::new()));
        let ae = all_entries.clone();
        let handler = Arc::new(move |batch: Vec<FileEntry>| {
            let mut r = ae.lock().unwrap();
            r.extend(batch);
            Ok(())
        });

        let scan_result = scanner.run(handler).unwrap();
        assert_eq!(
            scan_result.total_files, 3,
            "Should find 3 files (excluding file2.rs)"
        );
    }

    #[test]
    fn test_status_transitions() {
        let dir = create_test_dir("scanner_status");
        let root = dir.path().to_string_lossy().to_string();
        let config = ScannerConfig::new(&root);
        let scanner = Scanner::new(config).unwrap();

        assert_eq!(scanner.status(), "idle");

        scanner.pause();
        assert_eq!(scanner.status(), "paused");

        scanner.resume();

        let handler = Arc::new(|batch: Vec<FileEntry>| {
            let _ = batch;
            Ok(())
        });

        let _ = scanner.run(handler);
        assert_eq!(scanner.status(), "completed");
    }
}
