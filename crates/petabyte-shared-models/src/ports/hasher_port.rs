use crate::value_objects::{FileHash, PartialHash};

pub trait HasherPort: Send + Sync {
    fn hash_partial(&self, path: &std::path::Path, max_bytes: u64) -> Result<PartialHash, String>;
    fn hash_full(&self, path: &std::path::Path) -> Result<FileHash, String>;
    fn hash_chunk(&self, data: &[u8]) -> FileHash;
    fn hash_partial_chunk(&self, data: &[u8]) -> PartialHash;
}
