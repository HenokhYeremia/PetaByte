use std::collections::HashMap;
use std::fs;
use std::io::Read;
use std::sync::atomic::{AtomicBool, Ordering, AtomicU64};
use std::sync::Arc;

use petabyte_shared_models::entities::FileEntry;
use rayon::prelude::*;

use crate::config::DuplicateDetectionConfig;
use crate::error::{DuplicateError, DuplicateResult};
use crate::hash_cache::HashCache;

pub struct PartialHashMatcher {
    config: DuplicateDetectionConfig,
    partial_hashed: Arc<AtomicU64>,
}

impl PartialHashMatcher {
    pub fn new(config: &DuplicateDetectionConfig, partial_hashed: Arc<AtomicU64>) -> Self {
        Self {
            config: config.clone(),
            partial_hashed,
        }
    }

    pub fn compute_partial_hashes<'a>(
        &self,
        files: &[&'a FileEntry],
        cancel: &AtomicBool,
        hash_cache: &HashCache,
    ) -> DuplicateResult<Vec<(&'a FileEntry, String)>> {
        if cancel.load(Ordering::Relaxed) {
            return Err(DuplicateError::Cancelled);
        }

        let partial_hash_size = self.config.partial_hash_size;

        let results: Vec<DuplicateResult<(&FileEntry, String)>> = files
            .par_iter()
            .copied()
            .map(|file| {
                if cancel.load(Ordering::Relaxed) {
                    return Err(DuplicateError::Cancelled);
                }

                let path = file.file_path.as_path();

                let partial = match hash_cache.lookup(file.file_size, "") {
                    Some(full_hash) => {
                        self.partial_hashed.fetch_add(1, Ordering::Relaxed);
                        full_hash
                    }
                    None => {
                        let hash = compute_partial_hash(path, partial_hash_size)?;
                        self.partial_hashed.fetch_add(1, Ordering::Relaxed);
                        hash
                    }
                };

                Ok((file, partial))
            })
            .collect();

        let mut errors: Vec<String> = Vec::new();
        let mut hashed: Vec<(&FileEntry, String)> = Vec::with_capacity(results.len());

        for result in results {
            match result {
                Ok(entry) => hashed.push(entry),
                Err(DuplicateError::Cancelled) => return Err(DuplicateError::Cancelled),
                Err(e) => errors.push(e.to_string()),
            }
        }

        Ok(hashed)
    }

    pub fn group_by_partial_hash<'a>(
        &self,
        hashed: Vec<(&'a FileEntry, String)>,
    ) -> Vec<(String, Vec<&'a FileEntry>)> {
        let mut groups: HashMap<String, Vec<&'a FileEntry>> = HashMap::new();

        for (file, hash) in hashed {
            groups.entry(hash).or_default().push(file);
        }

        let mut result: Vec<(String, Vec<&'a FileEntry>)> = groups
            .into_iter()
            .filter(|(_, files)| files.len() > 1)
            .collect();

        result.sort_by(|a, b| a.1.len().cmp(&b.1.len()).reverse());
        result
    }
}

fn compute_partial_hash(path: &std::path::Path, max_bytes: u64) -> DuplicateResult<String> {
    let mut file = fs::File::open(path)?;
    let mut hasher = blake3::Hasher::new();
    let mut buffer = vec![0u8; max_bytes as usize];
    let bytes_read = file.read(&mut buffer)?;
    hasher.update(&buffer[..bytes_read]);
    Ok(hasher.finalize().to_hex().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use petabyte_shared_models::value_objects::FilePath;
    use std::io::Write;

    fn make_entry(path: &str, size: u64) -> FileEntry {
        FileEntry::new(
            FilePath::new(path).unwrap(),
            None,
            path.rsplit('/').next().unwrap_or(path).into(),
            path.rsplit('.').next().map(|e| e.to_string()),
            size,
            false,
            false,
            0o644,
            1_700_000_000,
            1,
        )
    }

    fn create_temp_file(content: &[u8]) -> (tempfile::TempDir, String) {
        let dir = tempfile::TempDir::new().unwrap();
        let path = dir.path().join("test.dat");
        let mut f = fs::File::create(&path).unwrap();
        f.write_all(content).unwrap();
        let path_str = path.to_string_lossy().to_string();
        (dir, path_str)
    }

    #[test]
    fn test_same_content_same_hash() {
        let content = b"hello world this is a test file for partial hash matching";
        let (_d1, p1) = create_temp_file(content);
        let (_d2, p2) = create_temp_file(content);

        let cancel = AtomicBool::new(false);
        let config = DuplicateDetectionConfig::default();
        let counter = Arc::new(AtomicU64::new(0));
        let matcher = PartialHashMatcher::new(&config, counter.clone());
        let hash_cache = HashCache::new();

        let files = vec![make_entry(&p1, content.len() as u64), make_entry(&p2, content.len() as u64)];
        let refs: Vec<&FileEntry> = files.iter().collect();
        let hashed = matcher.compute_partial_hashes(&refs, &cancel, &hash_cache).unwrap();
        assert_eq!(hashed.len(), 2);
        assert_eq!(hashed[0].1, hashed[1].1);
    }

    #[test]
    fn test_different_content_different_hash() {
        let (_d1, p1) = create_temp_file(b"content a");
        let (_d2, p2) = create_temp_file(b"content b");

        let cancel = AtomicBool::new(false);
        let config = DuplicateDetectionConfig::default();
        let counter = Arc::new(AtomicU64::new(0));
        let matcher = PartialHashMatcher::new(&config, counter.clone());
        let hash_cache = HashCache::new();

        let files = vec![
            make_entry(&p1, 9),
            make_entry(&p2, 9),
        ];
        let refs: Vec<&FileEntry> = files.iter().collect();
        let hashed = matcher.compute_partial_hashes(&refs, &cancel, &hash_cache).unwrap();
        assert_eq!(hashed.len(), 2);
        assert_ne!(hashed[0].1, hashed[1].1);
    }

    #[test]
    fn test_cancellation() {
        let cancel = AtomicBool::new(true);
        let config = DuplicateDetectionConfig::default();
        let counter = Arc::new(AtomicU64::new(0));
        let matcher = PartialHashMatcher::new(&config, counter.clone());
        let hash_cache = HashCache::new();

        let files: Vec<FileEntry> = vec![];
        let refs: Vec<&FileEntry> = files.iter().collect();
        let result = matcher.compute_partial_hashes(&refs, &cancel, &hash_cache);
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), DuplicateError::Cancelled));
    }

    #[test]
    fn test_group_by_partial_hash() {
        let config = DuplicateDetectionConfig::default();
        let counter = Arc::new(AtomicU64::new(0));
        let matcher = PartialHashMatcher::new(&config, counter);

        let f1 = make_entry("/a.txt", 100);
        let f2 = make_entry("/b.txt", 100);
        let f3 = make_entry("/c.txt", 100);

        let hashed = vec![
            (&f1, "hash123".into()),
            (&f2, "hash123".into()),
            (&f3, "hash456".into()),
        ];

        let groups = matcher.group_by_partial_hash(hashed);
        assert_eq!(groups.len(), 1);
        assert_eq!(groups[0].0, "hash123");
        assert_eq!(groups[0].1.len(), 2);
    }

    #[test]
    fn test_large_file_partial_hash() {
        let content = vec![0xABu8; 100_000];
        let (_d, path) = create_temp_file(&content);

        let cancel = AtomicBool::new(false);
        let config = DuplicateDetectionConfig::default().with_partial_hash_size(8_192);
        let counter = Arc::new(AtomicU64::new(0));
        let matcher = PartialHashMatcher::new(&config, counter.clone());
        let hash_cache = HashCache::new();

        let files = vec![make_entry(&path, content.len() as u64)];
        let refs: Vec<&FileEntry> = files.iter().collect();
        let hashed = matcher.compute_partial_hashes(&refs, &cancel, &hash_cache).unwrap();
        assert_eq!(hashed.len(), 1);
        assert!(!hashed[0].1.is_empty());
    }

    #[test]
    fn test_partial_hash_cache_hit() {
        let content = b"test content for cache test";
        let (_d, path) = create_temp_file(content);

        let cancel = AtomicBool::new(false);
        let config = DuplicateDetectionConfig::default();
        let counter = Arc::new(AtomicU64::new(0));
        let matcher = PartialHashMatcher::new(&config, counter.clone());

        let hash_cache = HashCache::new();
        hash_cache.insert(content.len() as u64, "", "cached_full_hash");

        let files = vec![make_entry(&path, content.len() as u64)];
        let refs: Vec<&FileEntry> = files.iter().collect();
        let hashed = matcher.compute_partial_hashes(&refs, &cancel, &hash_cache).unwrap();
        assert_eq!(hashed[0].1, "cached_full_hash");
    }
}
