use crate::entities::{CacheCleanResult, CacheEntry};

pub trait CacheCleanerPort: Send + Sync {
    fn scan(&self) -> Result<Vec<CacheEntry>, String>;
    fn calculate_total_size(&self) -> Result<u64, String>;
    fn clean(&self, entries: &[CacheEntry]) -> Result<CacheCleanResult, String>;
    fn clean_all(&self) -> Result<CacheCleanResult, String>;
    fn estimate(&self, entries: &[CacheEntry]) -> u64;
}
