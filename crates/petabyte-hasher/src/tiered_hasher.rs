use crate::error::HashResult;
use crate::full_hasher::FullHasher;
use crate::hash_cache::HashCache;
use crate::partial_hasher::PartialHasher;
use petabyte_shared_models::ports::HasherPort;
use petabyte_shared_models::value_objects::{FileHash, PartialHash};
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};

pub struct TieredHasher {
    partial_hasher: PartialHasher,
    full_hasher: FullHasher,
    cache: HashCache,
    cancel: Option<AtomicBool>,
}

impl TieredHasher {
    pub fn new(partial_max_bytes: u64, chunk_size: usize, cancel: Option<AtomicBool>) -> Self {
        Self {
            partial_hasher: PartialHasher::new(partial_max_bytes),
            full_hasher: FullHasher::new(chunk_size),
            cache: HashCache::new(),
            cancel,
        }
    }

    pub fn cache(&self) -> &HashCache {
        &self.cache
    }

    pub fn set_cancel(&mut self, cancel: AtomicBool) {
        self.cancel = Some(cancel);
    }

    fn is_cancelled(&self) -> bool {
        self.cancel
            .as_ref()
            .is_some_and(|c| c.load(Ordering::Relaxed))
    }

    pub fn hash_partial_with_path(&self, path: &Path, file_size: u64) -> HashResult<PartialHash> {
        if self.is_cancelled() {
            return Err(crate::error::HashError::Cancelled);
        }

        if let Some(cached) = self.cache.get_partial(file_size, path) {
            return Ok(cached);
        }

        let cancel_ref = self.cancel.as_ref();
        let hash = self.partial_hasher.hash(path, cancel_ref)?;

        self.cache.set_partial(file_size, path, &hash);
        Ok(hash)
    }

    pub fn hash_full_with_path(&self, path: &Path, file_size: u64) -> HashResult<FileHash> {
        if self.is_cancelled() {
            return Err(crate::error::HashError::Cancelled);
        }

        if let Some(cached) = self.cache.get_full(file_size, path) {
            return Ok(cached);
        }

        let cancel_ref = self.cancel.as_ref();
        let hash = self.full_hasher.hash(path, cancel_ref)?;

        self.cache.set_full(file_size, path, &hash);
        Ok(hash)
    }
}

impl HasherPort for TieredHasher {
    fn hash_partial(&self, path: &Path, max_bytes: u64) -> Result<PartialHash, String> {
        if self.is_cancelled() {
            return Err("Hashing cancelled".to_string());
        }

        let file_size = std::fs::metadata(path).map_err(|e| e.to_string())?.len();

        if let Some(cached) = self.cache.get_partial(file_size, path) {
            return Ok(cached);
        }

        let cancel_ref = self.cancel.as_ref();
        let hash = self
            .partial_hasher
            .hash_with_max_bytes(path, max_bytes, cancel_ref)
            .map_err(|e| e.to_string())?;

        self.cache.set_partial(file_size, path, &hash);
        Ok(hash)
    }

    fn hash_full(&self, path: &Path) -> Result<FileHash, String> {
        if self.is_cancelled() {
            return Err("Hashing cancelled".to_string());
        }

        let file_size = std::fs::metadata(path).map_err(|e| e.to_string())?.len();

        if let Some(cached) = self.cache.get_full(file_size, path) {
            return Ok(cached);
        }

        let cancel_ref = self.cancel.as_ref();
        let hash = self
            .full_hasher
            .hash(path, cancel_ref)
            .map_err(|e| e.to_string())?;

        self.cache.set_full(file_size, path, &hash);
        Ok(hash)
    }

    fn hash_chunk(&self, data: &[u8]) -> FileHash {
        let hash = blake3::hash(data);
        FileHash::new(hash.to_hex().to_string())
    }

    fn hash_partial_chunk(&self, data: &[u8]) -> PartialHash {
        let hash = blake3::hash(data);
        PartialHash::new(hash.to_hex().to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    fn create_test_file(content: &[u8]) -> NamedTempFile {
        let mut f = NamedTempFile::new().unwrap();
        f.write_all(content).unwrap();
        f
    }

    #[test]
    fn test_tiered_partial_hash() {
        let hasher = TieredHasher::new(8192, 65536, None);
        let f = create_test_file(b"Hello, World!");
        let size = f.as_file().metadata().unwrap().len();
        let hash = hasher.hash_partial_with_path(f.path(), size).unwrap();
        assert_eq!(hash.as_str().len(), 64);
    }

    #[test]
    fn test_tiered_full_hash() {
        let hasher = TieredHasher::new(8192, 65536, None);
        let f = create_test_file(b"Hello, World!");
        let size = f.as_file().metadata().unwrap().len();
        let hash = hasher.hash_full_with_path(f.path(), size).unwrap();
        assert_eq!(hash.as_str().len(), 64);
    }

    #[test]
    fn test_cache_hits_partial() {
        let hasher = TieredHasher::new(8192, 65536, None);
        let f = create_test_file(b"Cache test content");
        let size = f.as_file().metadata().unwrap().len();

        let first = hasher.hash_partial_with_path(f.path(), size).unwrap();
        let stats_before = hasher.cache.stats();
        assert_eq!(stats_before.partial_misses, 1);

        let second = hasher.hash_partial_with_path(f.path(), size).unwrap();
        assert_eq!(first, second);
        let stats_after = hasher.cache.stats();
        assert_eq!(stats_after.partial_hits, 1);
    }

    #[test]
    fn test_cache_hits_full() {
        let hasher = TieredHasher::new(8192, 65536, None);
        let f = create_test_file(b"Full cache test");
        let size = f.as_file().metadata().unwrap().len();

        let first = hasher.hash_full_with_path(f.path(), size).unwrap();
        let second = hasher.hash_full_with_path(f.path(), size).unwrap();
        assert_eq!(first, second);

        let stats = hasher.cache.stats();
        assert_eq!(stats.full_hits, 1);
        assert_eq!(stats.full_misses, 1);
    }

    #[test]
    fn test_hasher_port_trait() {
        let hasher = TieredHasher::new(8192, 65536, None);
        let f = create_test_file(b"Trait test");
        let partial = hasher.hash_partial(f.path(), 8192).unwrap();
        let full = hasher.hash_full(f.path()).unwrap();
        assert_eq!(partial.as_str().len(), 64);
        assert_eq!(full.as_str().len(), 64);
    }

    #[test]
    fn test_hash_chunk() {
        let hasher = TieredHasher::new(8192, 65536, None);
        let hash = hasher.hash_chunk(b"chunk data");
        assert_eq!(hash.as_str().len(), 64);
    }

    #[test]
    fn test_hash_partial_chunk() {
        let hasher = TieredHasher::new(8192, 65536, None);
        let hash = hasher.hash_partial_chunk(b"partial chunk data");
        assert_eq!(hash.as_str().len(), 64);
    }

    #[test]
    fn test_cancellation_before_hash() {
        let cancel = AtomicBool::new(true);
        let hasher = TieredHasher::new(8192, 65536, Some(cancel));
        let f = create_test_file(b"Cancel test");
        let size = f.as_file().metadata().unwrap().len();
        assert!(hasher.hash_partial_with_path(f.path(), size).is_err());
        assert!(hasher.hash_full_with_path(f.path(), size).is_err());
    }
}
