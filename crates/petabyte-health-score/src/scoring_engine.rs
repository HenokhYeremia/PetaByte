use crate::config::ScoringConfig;
use petabyte_shared_models::entities::{HealthFactor, HealthMetrics};
use chrono::Utc;

pub struct ScoringEngine {
    config: ScoringConfig,
}

impl ScoringEngine {
    pub fn new(config: ScoringConfig) -> Self {
        Self { config }
    }

    pub fn calculate(
        &self,
        total_files: u64,
        total_directories: u64,
        total_size_bytes: u64,
        free_space_bytes: u64,
        total_capacity_bytes: u64,
        duplicate_bytes: u64,
        temp_file_bytes: u64,
        large_file_bytes: u64,
    ) -> HealthMetrics {
        let free_space = crate::factors::calculate_free_space_score(
            free_space_bytes,
            total_capacity_bytes,
            &self.config,
        );
        let duplicate_ratio = crate::factors::calculate_duplicate_ratio_score(
            duplicate_bytes,
            total_size_bytes,
        );
        let temp_file_ratio = crate::factors::calculate_temp_file_ratio_score(
            temp_file_bytes,
            total_size_bytes,
        );
        let large_file_ratio = crate::factors::calculate_large_file_ratio_score(
            large_file_bytes,
            total_size_bytes,
            &self.config,
        );
        let fragmentation = crate::factors::calculate_fragmentation_score(
            total_files,
            total_directories,
        );

        let factors = vec![
            HealthFactor::new(
                "free_space",
                free_space,
                self.config.free_space_weight,
                "Available free space on the volume",
            ),
            HealthFactor::new(
                "duplicate_ratio",
                duplicate_ratio,
                self.config.duplicate_ratio_weight,
                "Ratio of duplicate file data to total data",
            ),
            HealthFactor::new(
                "temp_file_ratio",
                temp_file_ratio,
                self.config.temp_file_ratio_weight,
                "Ratio of temporary/transient files to total files",
            ),
            HealthFactor::new(
                "large_file_ratio",
                large_file_ratio,
                self.config.large_file_ratio_weight,
                "Ratio of large files to total storage",
            ),
            HealthFactor::new(
                "fragmentation",
                fragmentation,
                self.config.fragmentation_weight,
                "File distribution across directories",
            ),
        ];

        let total_weight = self.config.total_weight();
        let weighted_score: f64 = factors
            .iter()
            .map(|f| f.score * f.weight)
            .sum::<f64>()
            / total_weight;

        HealthMetrics {
            overall_score: (weighted_score * 100.0).round() / 100.0,
            factors,
            total_files,
            total_size_bytes,
            free_space_bytes,
            scanned_at: Utc::now(),
        }
    }
}

impl Default for ScoringEngine {
    fn default() -> Self {
        Self::new(ScoringConfig::default())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_perfect_health() {
        let engine = ScoringEngine::default();
        let metrics = engine.calculate(
            1000, 20, 100_000_000, // 100MB
            50_000_000_000, // 50GB free
            200_000_000_000, // 200GB total
            0,  // no duplicates
            0,  // no temp files
            5_000_000,  // 5MB large files
        );
        assert!(metrics.overall_score > 0.85);
        assert_eq!(metrics.factors.len(), 5);
    }

    #[test]
    fn test_poor_health() {
        let engine = ScoringEngine::default();
        let metrics = engine.calculate(
            100, 50,  // few files per dir
            1_000_000_000,  // total size
            1_000_000_000,  // 1GB free (full disk)
            1_000_000_000,  // total capacity = total size
            500_000_000, // 50% duplicates
            200_000_000, // 20% temp files
            800_000_000, // 80% large files
        );
        assert!(metrics.overall_score < 0.3);
    }

    #[test]
    fn test_factor_count() {
        let engine = ScoringEngine::default();
        let metrics = engine.calculate(500, 10, 1_000_000, 10_000_000_000, 100_000_000_000, 0, 0, 0);
        assert_eq!(metrics.factors.len(), 5);
    }

    #[test]
    fn test_score_range() {
        let engine = ScoringEngine::default();
        let metrics = engine.calculate(500, 10, 1_000_000, 10_000_000_000, 100_000_000_000, 100_000, 50_000, 200_000);
        assert!(metrics.overall_score >= 0.0);
        assert!(metrics.overall_score <= 1.0);
    }
}
