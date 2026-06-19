use std::collections::HashMap;
use std::fs;
use std::io::Read;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;

use petabyte_shared_models::entities::FileEntry;
use rayon::prelude::*;

use crate::error::{DuplicateError, DuplicateResult};
use crate::hash_cache::HashCache;

const STREAM_BUFFER_SIZE: usize = 65_536;

pub struct FullHashVerifier {
    full_hashed: Arc<AtomicU64>,
}

impl FullHashVerifier {
    pub fn new(full_hashed: Arc<AtomicU64>) -> Self {
        Self { full_hashed }
    }

    pub fn verify<'a>(
        &self,
        partial_hash: &str,
        files: &[&'a FileEntry],
        cancel: &AtomicBool,
        hash_cache: &HashCache,
    ) -> DuplicateResult<Vec<(&'a FileEntry, String)>> {
        if cancel.load(Ordering::Relaxed) {
            return Err(DuplicateError::Cancelled);
        }

        let results: Vec<DuplicateResult<(&FileEntry, String)>> = files
            .par_iter()
            .copied()
            .map(|file| {
                if cancel.load(Ordering::Relaxed) {
                    return Err(DuplicateError::Cancelled);
                }

                let full_hash =
                    if let Some(cached) = hash_cache.lookup(file.file_size, partial_hash) {
                        self.full_hashed.fetch_add(1, Ordering::Relaxed);
                        cached
                    } else {
                        let hash = compute_full_hash(file.file_path.as_path())?;
                        hash_cache.insert(file.file_size, partial_hash, &hash);
                        self.full_hashed.fetch_add(1, Ordering::Relaxed);
                        hash
                    };

                Ok((file, full_hash))
            })
            .collect();

        let mut verified: Vec<(&FileEntry, String)> = Vec::with_capacity(results.len());
        for result in results {
            match result {
                Ok(entry) => verified.push(entry),
                Err(DuplicateError::Cancelled) => return Err(DuplicateError::Cancelled),
                Err(_) => continue,
            }
        }

        Ok(verified)
    }

    #[must_use]
    pub fn group_by_full_hash<'a>(
        &self,
        verified: Vec<(&'a FileEntry, String)>,
    ) -> Vec<(String, Vec<&'a FileEntry>)> {
        let mut groups: HashMap<String, Vec<&'a FileEntry>> = HashMap::new();

        for (file, hash) in verified {
            groups.entry(hash).or_default().push(file);
        }

        let mut result: Vec<(String, Vec<&'a FileEntry>)> = groups
            .into_iter()
            .filter(|(_, files)| files.len() > 1)
            .collect();

        result.sort_by(|a, b| {
            let wasted_a = a.1[0].file_size * (a.1.len() as u64 - 1);
            let wasted_b = b.1[0].file_size * (b.1.len() as u64 - 1);
            wasted_b.cmp(&wasted_a)
        });
        result
    }
}

fn compute_full_hash(path: &std::path::Path) -> DuplicateResult<String> {
    let mut file = fs::File::open(path)?;
    let mut hasher = blake3::Hasher::new();
    let mut buffer = vec![0u8; STREAM_BUFFER_SIZE];

    loop {
        let bytes_read = file.read(&mut buffer)?;
        if bytes_read == 0 {
            break;
        }
        hasher.update(&buffer[..bytes_read]);
    }

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
            path.rsplit('.')
                .next()
                .map(std::string::ToString::to_string),
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
    fn test_identical_files_same_hash() {
        let content = b"exact duplicate content for full hash verification";
        let (_d1, p1) = create_temp_file(content);
        let (_d2, p2) = create_temp_file(content);

        let cancel = AtomicBool::new(false);
        let counter = Arc::new(AtomicU64::new(0));
        let verifier = FullHashVerifier::new(counter.clone());
        let hash_cache = HashCache::new();

        let f1 = make_entry(&p1, content.len() as u64);
        let f2 = make_entry(&p2, content.len() as u64);
        let refs = vec![&f1, &f2];

        let verified = verifier
            .verify("partial123", &refs, &cancel, &hash_cache)
            .unwrap();
        assert_eq!(verified.len(), 2);
        assert_eq!(verified[0].1, verified[1].1);
    }

    #[test]
    fn test_different_files_different_hash() {
        let (_d1, p1) = create_temp_file(b"content version A");
        let (_d2, p2) = create_temp_file(b"content version B");

        let cancel = AtomicBool::new(false);
        let counter = Arc::new(AtomicU64::new(0));
        let verifier = FullHashVerifier::new(counter.clone());
        let hash_cache = HashCache::new();

        let f1 = make_entry(&p1, 18);
        let f2 = make_entry(&p2, 18);
        let refs = vec![&f1, &f2];

        let verified = verifier
            .verify("partial456", &refs, &cancel, &hash_cache)
            .unwrap();
        assert_eq!(verified.len(), 2);
        assert_ne!(verified[0].1, verified[1].1);
    }

    #[test]
    fn test_cancellation() {
        let cancel = AtomicBool::new(true);
        let counter = Arc::new(AtomicU64::new(0));
        let verifier = FullHashVerifier::new(counter.clone());
        let hash_cache = HashCache::new();
        let files: Vec<&FileEntry> = vec![];

        let result = verifier.verify("hash", &files, &cancel, &hash_cache);
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), DuplicateError::Cancelled));
    }

    #[test]
    fn test_group_by_full_hash() {
        let counter = Arc::new(AtomicU64::new(0));
        let verifier = FullHashVerifier::new(counter);

        let f1 = make_entry("/a.txt", 100);
        let f2 = make_entry("/b.txt", 100);
        let f3 = make_entry("/c.txt", 100);

        let verified = vec![
            (&f1, "hash_abc".into()),
            (&f2, "hash_abc".into()),
            (&f3, "hash_def".into()),
        ];

        let groups = verifier.group_by_full_hash(verified);
        assert_eq!(groups.len(), 1);
        assert_eq!(groups[0].0, "hash_abc");
        assert_eq!(groups[0].1.len(), 2);
    }

    #[test]
    fn test_large_file_full_hash() {
        let content = vec![0xCDu8; 200_000];
        let (_d, path) = create_temp_file(&content);

        let cancel = AtomicBool::new(false);
        let counter = Arc::new(AtomicU64::new(0));
        let verifier = FullHashVerifier::new(counter.clone());
        let hash_cache = HashCache::new();

        let f = make_entry(&path, content.len() as u64);
        let refs = vec![&f];

        let verified = verifier
            .verify("partial_large", &refs, &cancel, &hash_cache)
            .unwrap();
        assert_eq!(verified.len(), 1);
        assert!(!verified[0].1.is_empty());
    }

    #[test]
    fn test_hash_cache_hit_during_verify() {
        let content = b"test data for cache hit during verify";
        let (_d, path) = create_temp_file(content);

        let cancel = AtomicBool::new(false);
        let counter = Arc::new(AtomicU64::new(0));
        let verifier = FullHashVerifier::new(counter.clone());
        let hash_cache = HashCache::new();
        hash_cache.insert(content.len() as u64, "partial_key", "cached_full");

        let f = make_entry(&path, content.len() as u64);
        let refs = vec![&f];

        let verified = verifier
            .verify("partial_key", &refs, &cancel, &hash_cache)
            .unwrap();
        assert_eq!(verified[0].1, "cached_full");
    }

    #[test]
    fn test_empty_file() {
        let (_d, path) = create_temp_file(b"");

        let cancel = AtomicBool::new(false);
        let counter = Arc::new(AtomicU64::new(0));
        let verifier = FullHashVerifier::new(counter.clone());
        let hash_cache = HashCache::new();

        let f = make_entry(&path, 0);
        let refs = vec![&f];

        let verified = verifier
            .verify("partial_empty", &refs, &cancel, &hash_cache)
            .unwrap();
        assert_eq!(verified.len(), 1);
        assert!(!verified[0].1.is_empty());
    }
}
