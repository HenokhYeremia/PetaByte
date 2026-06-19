use crate::config::ScoringConfig;

#[must_use]
pub fn calculate_free_space_score(
    free_space_bytes: u64,
    total_capacity_bytes: u64,
    config: &ScoringConfig,
) -> f64 {
    if total_capacity_bytes == 0 {
        return 0.5;
    }

    let free_gb = free_space_bytes as f64 / (1024.0 * 1024.0 * 1024.0);
    let free_ratio = free_space_bytes as f64 / total_capacity_bytes as f64;

    if free_gb >= config.free_space_threshold_gb {
        1.0
    } else if free_ratio >= 0.25 {
        0.8
    } else if free_ratio >= 0.15 {
        0.5
    } else if free_ratio >= 0.05 {
        0.2
    } else {
        0.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn config() -> ScoringConfig {
        ScoringConfig::default()
    }

    #[test]
    fn test_abundant_free_space() {
        let score = calculate_free_space_score(50_000_000_000, 200_000_000_000, &config());
        assert!((score - 1.0).abs() < 0.001);
    }

    #[test]
    fn test_critical_free_space() {
        let score = calculate_free_space_score(1_000_000_000, 200_000_000_000, &config());
        assert!((score - 0.0).abs() < 0.001);
    }

    #[test]
    fn test_zero_capacity() {
        let score = calculate_free_space_score(0, 0, &config());
        assert!((score - 0.5).abs() < 0.001);
    }

    #[test]
    fn test_low_free_space_ratio() {
        // 8GB free out of 100GB = 0.08 ratio, 8GB < threshold 10GB → 0.2
        let score = calculate_free_space_score(8_000_000_000, 100_000_000_000, &config());
        assert!((score - 0.2).abs() < 0.001);
    }
}
