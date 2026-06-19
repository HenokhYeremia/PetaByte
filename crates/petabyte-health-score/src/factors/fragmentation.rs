#[must_use]
pub fn calculate_fragmentation_score(total_files: u64, total_directories: u64) -> f64 {
    if total_directories == 0 {
        return 1.0;
    }

    let files_per_dir = total_files as f64 / total_directories as f64;

    if files_per_dir >= 50.0 {
        1.0
    } else if files_per_dir >= 20.0 {
        0.8
    } else if files_per_dir >= 10.0 {
        0.5
    } else if files_per_dir >= 5.0 {
        0.3
    } else {
        0.1
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_well_organized() {
        let score = calculate_fragmentation_score(1000, 10);
        assert!((score - 1.0).abs() < 0.001);
    }

    #[test]
    fn test_highly_fragmented() {
        let score = calculate_fragmentation_score(100, 50);
        assert!((score - 0.1).abs() < 0.001);
    }

    #[test]
    fn test_no_directories() {
        let score = calculate_fragmentation_score(100, 0);
        assert!((score - 1.0).abs() < 0.001);
    }

    #[test]
    fn test_moderate_fragmentation() {
        let score = calculate_fragmentation_score(300, 20);
        assert!((score - 0.5).abs() < 0.001);
    }
}
