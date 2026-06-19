use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthFactor {
    pub name: String,
    pub score: f64,
    pub weight: f64,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthMetrics {
    pub overall_score: f64,
    pub factors: Vec<HealthFactor>,
    pub total_files: u64,
    pub total_size_bytes: u64,
    pub free_space_bytes: u64,
    pub scanned_at: DateTime<Utc>,
}

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub enum RecommendationPriority {
    Critical,
    High,
    Medium,
    Low,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Recommendation {
    pub title: String,
    pub description: String,
    pub priority: RecommendationPriority,
    pub potential_freed_bytes: u64,
    pub action: String,
}

impl HealthFactor {
    pub fn new(name: &str, score: f64, weight: f64, description: &str) -> Self {
        Self {
            name: name.to_string(),
            score: score.clamp(0.0, 1.0),
            weight,
            description: description.to_string(),
        }
    }
}
