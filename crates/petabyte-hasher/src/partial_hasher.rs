use crate::error::HashResult;
use petabyte_shared_models::value_objects::PartialHash;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};

pub struct PartialHasher {
    default_max_bytes: u64,
}

impl PartialHasher {
    pub fn new(max_bytes: u64) -> Self {
        Self {
            default_max_bytes: max_bytes,
        }
    }

    pub fn hash(
        &self,
        path: &Path,
        cancel: Option<&AtomicBool>,
    ) -> HashResult<PartialHash> {
        self.hash_with_max_bytes(path, self.default_max_bytes, cancel)
    }

    pub fn hash_with_max_bytes(
        &self,
        path: &Path,
        max_bytes: u64,
        cancel: Option<&AtomicBool>,
    ) -> HashResult<PartialHash> {
        if let Some(c) = cancel {
            if c.load(Ordering::Relaxed) {
                return Err(crate::error::HashError::Cancelled);
            }
        }

        let metadata = std::fs::metadata(path)?;
        if metadata.len() == 0 {
            return Err(crate::error::HashError::EmptyFile(
                path.to_string_lossy().to_string(),
            ));
        }

        let mut file = std::fs::File::open(path)?;
        let read_size = std::cmp::min(max_bytes, metadata.len());

        let mut hasher = blake3::Hasher::new();
        let mut buf = vec![0u8; read_size as usize];
        use std::io::Read;
        file.read_exact(&mut buf)?;

        if let Some(c) = cancel {
            if c.load(Ordering::Relaxed) {
                return Err(crate::error::HashError::Cancelled);
            }
        }

        hasher.update(&buf);
        let result = hasher.finalize();
        Ok(PartialHash::new(result.to_hex().to_string()))
    }
}

impl Default for PartialHasher {
    fn default() -> Self {
        Self::new(8192)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    #[test]
    fn test_partial_hash_basic() {
        let hasher = PartialHasher::default();
        let mut f = NamedTempFile::new().unwrap();
        f.write_all(b"Hello, World!").unwrap();
        let hash = hasher.hash(f.path(), None).unwrap();
        assert!(!hash.is_empty());
        assert_eq!(hash.as_str().len(), 64);
    }

    #[test]
    fn test_same_content_same_hash() {
        let hasher = PartialHasher::default();
        let mut f1 = NamedTempFile::new().unwrap();
        f1.write_all(b"Same content").unwrap();
        let mut f2 = NamedTempFile::new().unwrap();
        f2.write_all(b"Same content").unwrap();
        assert_eq!(
            hasher.hash(f1.path(), None).unwrap(),
            hasher.hash(f2.path(), None).unwrap()
        );
    }

    #[test]
    fn test_different_content_different_hash() {
        let hasher = PartialHasher::default();
        let mut f1 = NamedTempFile::new().unwrap();
        f1.write_all(b"Content A").unwrap();
        let mut f2 = NamedTempFile::new().unwrap();
        f2.write_all(b"Content B").unwrap();
        assert_ne!(
            hasher.hash(f1.path(), None).unwrap(),
            hasher.hash(f2.path(), None).unwrap()
        );
    }

    #[test]
    fn test_partial_respects_max_bytes() {
        let hasher = PartialHasher::default();
        let mut f = NamedTempFile::new().unwrap();
        let data = vec![b'A'; 16_384];
        f.write_all(&data).unwrap();

        let partial_1k = hasher
            .hash_with_max_bytes(f.path(), 1024, None)
            .unwrap();
        let partial_8k = hasher.hash(f.path(), None).unwrap();
        let partial_full = hasher
            .hash_with_max_bytes(f.path(), 16_384, None)
            .unwrap();

        // All 'A' bytes — hashing more data changes the hash even if content is uniform
        assert_ne!(partial_1k, partial_8k);
        assert_ne!(partial_1k, partial_full);
        assert_ne!(partial_8k, partial_full);
        // Same limit always gives same hash
        assert_eq!(
            hasher.hash_with_max_bytes(f.path(), 1024, None).unwrap(),
            hasher.hash_with_max_bytes(f.path(), 1024, None).unwrap()
        );
    }

    #[test]
    fn test_empty_file_returns_error() {
        let hasher = PartialHasher::default();
        let f = NamedTempFile::new().unwrap();
        let result = hasher.hash(f.path(), None);
        assert!(result.is_err());
    }

    #[test]
    fn test_cancellation() {
        let hasher = PartialHasher::default();
        let mut f = NamedTempFile::new().unwrap();
        f.write_all(b"Some data").unwrap();
        let cancel = AtomicBool::new(true);
        let result = hasher.hash(f.path(), Some(&cancel));
        assert!(result.is_err());
    }
}
