use crate::error::{CleanerError, CleanerResult};
use std::path::Path;

#[derive(Debug, Clone, Default)]
pub struct RemovalStats {
    pub files_removed: u64,
    pub dirs_removed: u64,
    pub bytes_freed: u64,
    pub errors: Vec<String>,
}

pub struct SafeRemover {
    use_trash: bool,
    dry_run: bool,
}

impl SafeRemover {
    pub fn new() -> Self {
        Self {
            use_trash: true,
            dry_run: false,
        }
    }

    pub fn with_trash(mut self, use_trash: bool) -> Self {
        self.use_trash = use_trash;
        self
    }

    pub fn with_dry_run(mut self, dry_run: bool) -> Self {
        self.dry_run = dry_run;
        self
    }

    pub fn remove(&self, path: &Path) -> CleanerResult<RemovalStats> {
        let mut stats = RemovalStats::default();
        self.remove_recursive(path, &mut stats)?;
        Ok(stats)
    }

    fn remove_recursive(&self, path: &Path, stats: &mut RemovalStats) -> CleanerResult<()> {
        if !path.exists() {
            return Ok(());
        }

        if path.is_dir() {
            // Recursively remove contents first
            for entry in walkdir::WalkDir::new(path)
                .follow_links(false)
                .contents_first(true)
                .into_iter()
                .filter_map(|e| e.ok())
            {
                if entry.path() == path {
                    continue;
                }
                if entry.file_type().is_dir() {
                    if self.dry_run {
                        stats.dirs_removed += 1;
                    } else {
                        match self.remove_single(entry.path()) {
                            Ok(()) => stats.dirs_removed += 1,
                            Err(e) => stats.errors.push(e.to_string()),
                        }
                    }
                } else if entry.file_type().is_file() {
                    if let Ok(meta) = entry.metadata() {
                        stats.bytes_freed += meta.len();
                    }
                    if self.dry_run {
                        stats.files_removed += 1;
                    } else {
                        match self.remove_single(entry.path()) {
                            Ok(()) => stats.files_removed += 1,
                            Err(e) => stats.errors.push(e.to_string()),
                        }
                    }
                }
            }
        }

        // Remove the root path itself
        if let Ok(meta) = path.metadata() {
            stats.bytes_freed += meta.len();
        }
        if self.dry_run {
            if path.is_dir() {
                stats.dirs_removed += 1;
            } else {
                stats.files_removed += 1;
            }
        } else {
            match self.remove_single(path) {
                Ok(()) => {
                    if path.is_dir() {
                        stats.dirs_removed += 1;
                    } else {
                        stats.files_removed += 1;
                    }
                }
                Err(e) => stats.errors.push(e.to_string()),
            }
        }

        Ok(())
    }

    fn remove_single(&self, path: &Path) -> CleanerResult<()> {
        if self.use_trash {
            trash::delete(path)
                .map_err(|e| CleanerError::Trash(format!("Failed to trash {}: {}", path.display(), e)))
        } else {
            if path.is_dir() {
                std::fs::remove_dir_all(path)
                    .map_err(CleanerError::Io)
            } else {
                std::fs::remove_file(path)
                    .map_err(CleanerError::Io)
            }
        }
    }
}

impl Default for SafeRemover {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::TempDir;

    fn create_test_dir() -> TempDir {
        let dir = TempDir::new().unwrap();
        let sub = dir.path().join("subdir");
        std::fs::create_dir_all(&sub).unwrap();
        let mut f1 = std::fs::File::create(dir.path().join("f1.txt")).unwrap();
        f1.write_all(b"hello").unwrap();
        let mut f2 = std::fs::File::create(sub.join("f2.txt")).unwrap();
        f2.write_all(b"world").unwrap();
        dir
    }

    #[test]
    fn test_dry_run_does_not_delete() {
        let remover = SafeRemover::new().with_dry_run(true);
        let dir = create_test_dir();
        let path = dir.path().to_path_buf();
        let stats = remover.remove(&path).unwrap();
        // 2 files + 2 dirs (root + subdir)
        assert_eq!(stats.files_removed + stats.dirs_removed, 4);
        assert!(path.exists());
    }

    #[test]
    fn test_remove_file_permanently() {
        let remover = SafeRemover::new().with_trash(false);
        let dir = TempDir::new().unwrap();
        let file_path = dir.path().join("test.txt");
        std::fs::write(&file_path, b"data").unwrap();
        assert!(file_path.exists());

        let stats = remover.remove(&file_path).unwrap();
        assert_eq!(stats.files_removed, 1);
        assert!(!file_path.exists());
    }

    #[test]
    fn test_remove_nonexistent_path() {
        let remover = SafeRemover::new();
        let stats = remover.remove(Path::new("C:\\nonexistent_xyz_test")).unwrap();
        assert_eq!(stats.files_removed, 0);
        assert!(stats.errors.is_empty());
    }

    #[test]
    fn test_bytes_freed_tracked() {
        let remover = SafeRemover::new().with_trash(false);
        let dir = TempDir::new().unwrap();
        let file_path = dir.path().join("test.bin");
        let data = vec![0u8; 1024];
        std::fs::write(&file_path, &data).unwrap();

        let stats = remover.remove(&file_path).unwrap();
        assert_eq!(stats.files_removed, 1);
        assert_eq!(stats.bytes_freed, 1024);
    }
}
