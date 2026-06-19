#[derive(Debug, Clone)]
pub struct ScoringConfig {
    pub free_space_weight: f64,
    pub duplicate_ratio_weight: f64,
    pub temp_file_ratio_weight: f64,
    pub large_file_ratio_weight: f64,
    pub fragmentation_weight: f64,
    pub free_space_threshold_gb: f64,
    pub large_file_threshold_mb: u64,
    pub temp_extensions: Vec<String>,
}

impl Default for ScoringConfig {
    fn default() -> Self {
        Self {
            free_space_weight: 0.30,
            duplicate_ratio_weight: 0.25,
            temp_file_ratio_weight: 0.20,
            large_file_ratio_weight: 0.15,
            fragmentation_weight: 0.10,
            free_space_threshold_gb: 10.0,
            large_file_threshold_mb: 100,
            temp_extensions: vec![
                "tmp".into(),
                "temp".into(),
                "bak".into(),
                "swp".into(),
                "log".into(),
                "cache".into(),
                "~".into(),
            ],
        }
    }
}

impl ScoringConfig {
    #[must_use]
    pub fn total_weight(&self) -> f64 {
        self.free_space_weight
            + self.duplicate_ratio_weight
            + self.temp_file_ratio_weight
            + self.large_file_ratio_weight
            + self.fragmentation_weight
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_weights_sum_to_one() {
        let config = ScoringConfig::default();
        let total = config.total_weight();
        assert!((total - 1.0).abs() < 0.001);
    }

    #[test]
    fn test_custom_config() {
        let config = ScoringConfig {
            free_space_weight: 0.5,
            duplicate_ratio_weight: 0.3,
            temp_file_ratio_weight: 0.1,
            large_file_ratio_weight: 0.1,
            fragmentation_weight: 0.0,
            ..Default::default()
        };
        assert!((config.total_weight() - 1.0).abs() < 0.001);
    }
}
