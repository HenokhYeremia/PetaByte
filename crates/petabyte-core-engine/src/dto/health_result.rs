use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthResultDto {
    pub overall_score: f64,
    pub factors: Vec<HealthFactorDto>,
    pub total_files: u64,
    pub total_size_bytes: u64,
    pub free_space_bytes: u64,
    pub scanned_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthFactorDto {
    pub name: String,
    pub score: f64,
    pub weight: f64,
    pub description: String,
}
