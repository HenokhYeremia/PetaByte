use petabyte_shared_models::entities::HealthMetrics;

pub struct TrendAnalyzer;

impl TrendAnalyzer {
    #[must_use]
    pub fn new() -> Self {
        Self
    }

    /// Compare two metrics snapshots and return a human-readable summary.
    #[must_use]
    pub fn compare(&self, previous: &HealthMetrics, current: &HealthMetrics) -> String {
        let diff = current.overall_score - previous.overall_score;
        let direction = if diff > 0.0 {
            "improved"
        } else if diff < 0.0 {
            "declined"
        } else {
            "stayed the same"
        };

        let pct = (diff.abs() * 100.0).round();

        let mut details = Vec::new();
        for cur_factor in &current.factors {
            if let Some(prev_factor) = previous.factors.iter().find(|f| f.name == cur_factor.name) {
                let fd = cur_factor.score - prev_factor.score;
                if fd.abs() > 0.05 {
                    let trend = if fd > 0.0 { "improved" } else { "declined" };
                    details.push(format!(
                        "  - {} {} ({:.1}%)",
                        cur_factor.name,
                        trend,
                        fd.abs() * 100.0
                    ));
                }
            }
        }

        if details.is_empty() {
            format!("Overall health {direction} (change: {pct:.1}%, no significant factor changes)")
        } else {
            format!(
                "Overall health {} ({:.1}%):\n{}",
                direction,
                pct,
                details.join("\n")
            )
        }
    }
}

impl Default for TrendAnalyzer {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use petabyte_shared_models::entities::HealthFactor;

    fn make_metrics(overall: f64, factor_scores: Vec<(&str, f64)>) -> HealthMetrics {
        HealthMetrics {
            overall_score: overall,
            factors: factor_scores
                .into_iter()
                .map(|(name, score)| HealthFactor::new(name, score, 0.2, ""))
                .collect(),
            total_files: 0,
            total_size_bytes: 0,
            free_space_bytes: 0,
            scanned_at: chrono::Utc::now(),
        }
    }

    #[test]
    fn test_improvement() {
        let prev = make_metrics(0.5, vec![("free_space", 0.5)]);
        let curr = make_metrics(0.8, vec![("free_space", 0.8)]);
        let analyzer = TrendAnalyzer::new();
        let result = analyzer.compare(&prev, &curr);
        assert!(result.contains("improved"));
        assert!(result.contains("free_space"));
    }

    #[test]
    fn test_decline() {
        let prev = make_metrics(0.8, vec![("free_space", 0.8)]);
        let curr = make_metrics(0.5, vec![("free_space", 0.5)]);
        let analyzer = TrendAnalyzer::new();
        let result = analyzer.compare(&prev, &curr);
        assert!(result.contains("declined"));
    }

    #[test]
    fn test_no_change() {
        let prev = make_metrics(0.7, vec![("free_space", 0.7)]);
        let curr = make_metrics(0.7, vec![("free_space", 0.7)]);
        let analyzer = TrendAnalyzer::new();
        let result = analyzer.compare(&prev, &curr);
        assert!(result.contains("stayed the same"));
    }

    #[test]
    fn test_no_significant_change() {
        let prev = make_metrics(0.7, vec![("free_space", 0.71)]);
        let curr = make_metrics(0.7, vec![("free_space", 0.70)]);
        let analyzer = TrendAnalyzer::new();
        let result = analyzer.compare(&prev, &curr);
        assert!(!result.contains("free_space"));
    }
}
