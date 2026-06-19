#[must_use]
pub fn calculate_temp_file_ratio_score(temp_file_bytes: u64, total_bytes: u64) -> f64 {
    if total_bytes == 0 {
        return 1.0;
    }

    let ratio = temp_file_bytes as f64 / total_bytes as f64;

    if ratio <= 0.01 {
        1.0
    } else if ratio <= 0.03 {
        0.8
    } else if ratio <= 0.05 {
        0.6
    } else if ratio <= 0.10 {
        0.3
    } else if ratio <= 0.20 {
        0.1
    } else {
        0.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_no_temp_files() {
        let score = calculate_temp_file_ratio_score(0, 100_000);
        assert!((score - 1.0).abs() < 0.001);
    }

    #[test]
    fn test_some_temp_files() {
        let score = calculate_temp_file_ratio_score(2_000, 100_000);
        assert!((score - 0.8).abs() < 0.001);
    }

    #[test]
    fn test_many_temp_files() {
        let score = calculate_temp_file_ratio_score(15_000, 100_000);
        assert!((score - 0.1).abs() < 0.001);
    }
}
