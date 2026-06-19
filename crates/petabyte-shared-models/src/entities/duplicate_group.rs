use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DuplicateGroup {
    pub group_id: String,
    pub file_size: u64,
    pub partial_hash: String,
    pub full_hash: String,
    pub file_count: u64,
    pub total_wasted_bytes: u64,
    pub members: Vec<DuplicateGroupMember>,
}

impl DuplicateGroup {
    pub fn wasted_bytes(&self) -> u64 {
        self.file_size * (self.file_count - 1)
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DuplicateGroupMember {
    pub file_path: String,
    pub file_name: String,
    pub file_size: u64,
    pub is_directory: bool,
    pub is_keep: bool,
    pub marked_for_removal: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DuplicateCandidate {
    pub file_path: String,
    pub file_size: u64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct HashCacheEntry {
    pub file_size: u64,
    pub partial_hash: String,
    pub full_hash: String,
    pub file_count: u64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DuplicateStats {
    pub total_groups: u64,
    pub total_duplicate_files: u64,
    pub total_wasted_bytes: u64,
    pub total_unique_size: u64,
    pub largest_group_size: u64,
    pub largest_group_wasted: u64,
    pub largest_group_count: u64,
}
