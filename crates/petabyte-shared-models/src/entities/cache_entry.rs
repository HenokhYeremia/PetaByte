use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum CacheCategory {
    Npm,
    Pip,
    Cargo,
    Maven,
    Gradle,
    NuGet,
    Mix,
    Go,
    Docker,
    Browser,
    System,
    Other(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheEntry {
    pub path: String,
    pub category: CacheCategory,
    pub size_bytes: u64,
    pub file_count: u64,
    pub last_accessed: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheCleanResult {
    pub entries_removed: Vec<String>,
    pub total_bytes_freed: u64,
    pub errors: Vec<String>,
}
