use crate::config::ScoringConfig;

pub fn calculate_large_file_ratio_score(
    large_file_bytes: u64,
    total_bytes: u64,
    _config: &ScoringConfig,
) -> f64 {
    if total_bytes == 0 {
        return 1.0;
    }

    let ratio = large_file_bytes as f64 / total_bytes as f64;

    if ratio <= 0.10 {
        1.0
    } else if ratio <= 0.25 {
        0.8
    } else if ratio <= 0.40 {
        0.5
    } else if ratio <= 0.60 {
        0.3
    } else if ratio <= 0.80 {
        0.1
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
    fn test_few_large_files() {
        let score = calculate_large_file_ratio_score(5_000, 100_000, &config());
        assert!((score - 1.0).abs() < 0.001);
    }

    #[test]
    fn test_many_large_files() {
        let score = calculate_large_file_ratio_score(70_000, 100_000, &config());
        assert!((score - 0.1).abs() < 0.001);
    }

    #[test]
    fn test_moderate_large_files() {
        let score = calculate_large_file_ratio_score(25_000, 100_000, &config());
        assert!((score - 0.8).abs() < 0.001);
    }
}
