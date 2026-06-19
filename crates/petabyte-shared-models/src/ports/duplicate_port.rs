use std::sync::atomic::AtomicBool;
use std::sync::Arc;

use crate::entities::{DuplicateGroup, DuplicateStats};
use crate::ports::ProgressEmitter;

#[derive(Debug, Clone)]
pub struct DuplicateProgress {
    pub total_candidates: u64,
    pub partial_hashed: u64,
    pub full_hashed: u64,
    pub groups_found: u64,
    pub elapsed_secs: u64,
    pub stage: String,
    pub hash_cache_hits: u64,
    pub hash_cache_misses: u64,
}

#[derive(Debug, Clone)]
pub struct DuplicateResult {
    pub groups: Vec<DuplicateGroup>,
    pub stats: DuplicateStats,
    pub progress: DuplicateProgress,
}

pub trait DuplicateDetector: Send + Sync {
    fn detect(
        &self,
        files: &[crate::entities::FileEntry],
        cancel: &AtomicBool,
    ) -> Result<DuplicateResult, String>;

    fn detect_with_emitter(
        &self,
        files: &[crate::entities::FileEntry],
        cancel: &AtomicBool,
        emitter: Option<Arc<dyn ProgressEmitter>>,
    ) -> Result<DuplicateResult, String>;

    fn progress(&self) -> DuplicateProgress;
}
