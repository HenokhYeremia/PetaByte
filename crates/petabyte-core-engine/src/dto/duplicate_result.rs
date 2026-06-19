use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DuplicateResultDto {
    pub total_groups: u64,
    pub total_duplicate_files: u64,
    pub total_wasted_bytes: u64,
    pub total_unique_size: u64,
    pub largest_group_size: u64,
    pub largest_group_wasted: u64,
    pub groups: Vec<DuplicateGroupDto>,
    pub partial_hashed: u64,
    pub full_hashed: u64,
    pub hash_cache_hits: u64,
    pub hash_cache_misses: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DuplicateGroupDto {
    pub group_id: String,
    pub file_size: u64,
    pub file_count: u64,
    pub total_wasted_bytes: u64,
    pub members: Vec<DuplicateMemberDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DuplicateMemberDto {
    pub file_path: String,
    pub file_name: String,
    pub file_size: u64,
}
