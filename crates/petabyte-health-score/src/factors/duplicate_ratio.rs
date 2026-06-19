#[must_use]
pub fn calculate_duplicate_ratio_score(duplicate_bytes: u64, total_bytes: u64) -> f64 {
    if total_bytes == 0 {
        return 1.0;
    }

    let ratio = duplicate_bytes as f64 / total_bytes as f64;

    if ratio <= 0.01 {
        1.0
    } else if ratio <= 0.05 {
        0.8
    } else if ratio <= 0.10 {
        0.6
    } else if ratio <= 0.20 {
        0.3
    } else if ratio <= 0.40 {
        0.1
    } else {
        0.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_no_duplicates() {
        let score = calculate_duplicate_ratio_score(0, 100_000);
        assert!((score - 1.0).abs() < 0.001);
    }

    #[test]
    fn test_some_duplicates() {
        let score = calculate_duplicate_ratio_score(3_000, 100_000);
        assert!((score - 0.8).abs() < 0.001);
    }

    #[test]
    fn test_high_duplicates() {
        let score = calculate_duplicate_ratio_score(50_000, 100_000);
        assert!((score - 0.0).abs() < 0.001);
    }

    #[test]
    fn test_empty_total() {
        let score = calculate_duplicate_ratio_score(0, 0);
        assert!((score - 1.0).abs() < 0.001);
    }
}
