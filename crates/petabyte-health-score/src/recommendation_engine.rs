use petabyte_shared_models::entities::{HealthFactor, HealthMetrics, Recommendation, RecommendationPriority};

pub struct RecommendationEngine;

impl RecommendationEngine {
    pub fn new() -> Self {
        Self
    }

    pub fn generate(&self, metrics: &HealthMetrics) -> Vec<Recommendation> {
        let mut recommendations = Vec::new();

        for factor in &metrics.factors {
            if factor.score >= 0.7 {
                continue;
            }
            if let Some(rec) = self.recommend_for_factor(factor, metrics) {
                recommendations.push(rec);
            }
        }

        recommendations.sort_by(|a, b| a.priority.cmp(&b.priority));

        recommendations
    }

    fn recommend_for_factor(
        &self,
        factor: &HealthFactor,
        metrics: &HealthMetrics,
    ) -> Option<Recommendation> {
        match factor.name.as_str() {
            "free_space" => {
                let priority = if factor.score < 0.2 {
                    RecommendationPriority::Critical
                } else if factor.score < 0.5 {
                    RecommendationPriority::High
                } else {
                    RecommendationPriority::Medium
                };

                Some(Recommendation {
                    title: "Low disk space".into(),
                    description: format!(
                        "Only {:.1} GB free out of {:.1} GB total. Consider freeing up space.",
                        metrics.free_space_bytes as f64 / 1e9,
                        metrics.total_size_bytes as f64 / 1e9,
                    ),
                    priority,
                    potential_freed_bytes: metrics.free_space_bytes,
                    action: "Run cache cleaner or delete unused files".into(),
                })
            }
            "duplicate_ratio" => {
                let priority = if factor.score < 0.2 {
                    RecommendationPriority::High
                } else {
                    RecommendationPriority::Medium
                };

                let wasted = (metrics.total_size_bytes as f64 * (1.0 - factor.score)) as u64;

                Some(Recommendation {
                    title: "High duplicate file ratio".into(),
                    description: format!(
                        "Duplicates consume significant space. Estimated waste: {:.1} MB.",
                        wasted as f64 / 1e6,
                    ),
                    priority,
                    potential_freed_bytes: wasted,
                    action: "Run duplicate file finder and remove duplicates".into(),
                })
            }
            "temp_file_ratio" => {
                let priority = if factor.score < 0.3 {
                    RecommendationPriority::High
                } else {
                    RecommendationPriority::Medium
                };

                Some(Recommendation {
                    title: "Many temporary files".into(),
                    description: "Temporary and cache files are consuming disk space.".into(),
                    priority,
                    potential_freed_bytes: 0,
                    action: "Run cache cleaner to remove temporary files".into(),
                })
            }
            "large_file_ratio" => {
                Some(Recommendation {
                    title: "Large files detected".into(),
                    description: "A significant portion of storage is consumed by large files.".into(),
                    priority: RecommendationPriority::Low,
                    potential_freed_bytes: 0,
                    action: "Review large files and archive or delete unnecessary ones".into(),
                })
            }
            "fragmentation" => {
                Some(Recommendation {
                    title: "File fragmentation detected".into(),
                    description: "Files are spread across many directories with few files each.".into(),
                    priority: RecommendationPriority::Low,
                    potential_freed_bytes: 0,
                    action: "Consider reorganizing files into fewer directories".into(),
                })
            }
            _ => None,
        }
    }
}

impl Default for RecommendationEngine {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_factor(name: &str, score: f64) -> HealthFactor {
        HealthFactor::new(name, score, 0.2, "")
    }

    #[test]
    fn test_no_recommendations_when_healthy() {
        let metrics = HealthMetrics {
            overall_score: 0.95,
            factors: vec![
                make_factor("free_space", 1.0),
                make_factor("duplicate_ratio", 1.0),
                make_factor("temp_file_ratio", 1.0),
            ],
            total_files: 0,
            total_size_bytes: 0,
            free_space_bytes: 0,
            scanned_at: chrono::Utc::now(),
        };
        let engine = RecommendationEngine::new();
        let recs = engine.generate(&metrics);
        assert!(recs.is_empty());
    }

    #[test]
    fn test_recommendations_for_poor_factors() {
        let metrics = HealthMetrics {
            overall_score: 0.2,
            factors: vec![
                make_factor("free_space", 0.1),
                make_factor("duplicate_ratio", 0.3),
            ],
            total_files: 0,
            total_size_bytes: 100_000_000_000,
            free_space_bytes: 1_000_000_000,
            scanned_at: chrono::Utc::now(),
        };
        let engine = RecommendationEngine::new();
        let recs = engine.generate(&metrics);
        assert!(!recs.is_empty());
        assert!(recs.iter().any(|r| r.title.contains("disk")));
    }

    #[test]
    fn test_priority_ordering() {
        let metrics = HealthMetrics {
            overall_score: 0.2,
            factors: vec![
                make_factor("free_space", 0.1),
                make_factor("duplicate_ratio", 0.3),
            ],
            total_files: 0,
            total_size_bytes: 100_000_000_000,
            free_space_bytes: 1_000_000_000,
            scanned_at: chrono::Utc::now(),
        };
        let engine = RecommendationEngine::new();
        let recs = engine.generate(&metrics);
        assert!(!recs.is_empty());
        assert_eq!(recs[0].priority, RecommendationPriority::Critical);
    }
}
