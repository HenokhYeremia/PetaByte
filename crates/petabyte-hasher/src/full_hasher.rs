use crate::error::HashResult;
use petabyte_shared_models::value_objects::FileHash;
use std::io::Read;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};

const DEFAULT_CHUNK_SIZE: usize = 65_536;

pub struct FullHasher {
    chunk_size: usize,
}

impl FullHasher {
    pub fn new(chunk_size: usize) -> Self {
        Self { chunk_size }
    }

    pub fn hash(
        &self,
        path: &Path,
        cancel: Option<&AtomicBool>,
    ) -> HashResult<FileHash> {
        if let Some(c) = cancel {
            if c.load(Ordering::Relaxed) {
                return Err(crate::error::HashError::Cancelled);
            }
        }

        let mut file = std::fs::File::open(path)?;

        let mut hasher = blake3::Hasher::new();
        let mut buf = vec![0u8; self.chunk_size];

        loop {
            if let Some(c) = cancel {
                if c.load(Ordering::Relaxed) {
                    return Err(crate::error::HashError::Cancelled);
                }
            }

            let bytes_read = file.read(&mut buf)?;
            if bytes_read == 0 {
                break;
            }
            hasher.update(&buf[..bytes_read]);
        }

        let result = hasher.finalize();
        Ok(FileHash::new(result.to_hex().to_string()))
    }
}

impl Default for FullHasher {
    fn default() -> Self {
        Self::new(DEFAULT_CHUNK_SIZE)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    #[test]
    fn test_full_hash_basic() {
        let hasher = FullHasher::default();
        let mut f = NamedTempFile::new().unwrap();
        f.write_all(b"Hello, World!").unwrap();
        let hash = hasher.hash(f.path(), None).unwrap();
        assert!(!hash.is_empty());
        assert_eq!(hash.as_str().len(), 64);
    }

    #[test]
    fn test_same_content_same_hash() {
        let hasher = FullHasher::default();
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
        let hasher = FullHasher::default();
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
    fn test_large_file_full_hash() {
        let hasher = FullHasher::default();
        let mut f = NamedTempFile::new().unwrap();
        let data = vec![b'X'; 1_000_000];
        f.write_all(&data).unwrap();
        let hash = hasher.hash(f.path(), None).unwrap();
        assert!(!hash.is_empty());
        assert_eq!(hash.as_str().len(), 64);
    }

    #[test]
    fn test_empty_file_full_hash() {
        let hasher = FullHasher::default();
        let f = NamedTempFile::new().unwrap();
        let hash = hasher.hash(f.path(), None).unwrap();
        assert!(!hash.is_empty());
        assert_eq!(hash.as_str().len(), 64);
    }

    #[test]
    fn test_cancellation() {
        let hasher = FullHasher::default();
        let mut f = NamedTempFile::new().unwrap();
        f.write_all(b"Some data").unwrap();
        let cancel = AtomicBool::new(true);
        let result = hasher.hash(f.path(), Some(&cancel));
        assert!(result.is_err());
    }

    #[test]
    fn test_partial_and_full_differ() {
        let hasher_full = FullHasher::default();
        let hasher_partial = crate::partial_hasher::PartialHasher::default();
        let mut f = NamedTempFile::new().unwrap();
        let data = vec![b'Y'; 100_000];
        f.write_all(&data).unwrap();
        let full = hasher_full.hash(f.path(), None).unwrap();
        let partial = hasher_partial.hash(f.path(), None).unwrap();
        assert_ne!(full.as_str(), partial.as_str());
    }
}
