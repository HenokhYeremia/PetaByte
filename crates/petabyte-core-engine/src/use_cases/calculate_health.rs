use std::sync::Arc;

use petabyte_shared_models::entities::HealthMetrics;
use petabyte_shared_models::ports::HealthScorePort;

use crate::dto::{HealthFactorDto, HealthResultDto};
use crate::error::EngineError;

pub struct CalculateHealthUseCase {
    calculator: Arc<dyn HealthScorePort>,
}

impl CalculateHealthUseCase {
    pub fn new(calculator: Arc<dyn HealthScorePort>) -> Self {
        Self { calculator }
    }

    pub fn execute(&self) -> Result<HealthResultDto, EngineError> {
        let metrics = self.calculator.calculate().map_err(EngineError::Port)?;

        Ok(HealthResultDto {
            overall_score: metrics.overall_score,
            factors: metrics
                .factors
                .into_iter()
                .map(|f| HealthFactorDto {
                    name: f.name,
                    score: f.score,
                    weight: f.weight,
                    description: f.description,
                })
                .collect(),
            total_files: metrics.total_files,
            total_size_bytes: metrics.total_size_bytes,
            free_space_bytes: metrics.free_space_bytes,
            scanned_at: metrics.scanned_at,
        })
    }

    pub fn get_recommendations(
        &self,
        metrics: &HealthMetrics,
    ) -> Vec<petabyte_shared_models::entities::Recommendation> {
        self.calculator.get_recommendations(metrics)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;
    use petabyte_shared_models::entities::*;
    use std::sync::Arc;

    struct MockCalc;
    impl HealthScorePort for MockCalc {
        fn calculate(&self) -> Result<HealthMetrics, String> {
            Ok(HealthMetrics {
                overall_score: 0.85,
                factors: vec![HealthFactor::new(
                    "free_space",
                    0.9,
                    0.3,
                    "Free space score",
                )],
                total_files: 100,
                total_size_bytes: 1_000_000,
                free_space_bytes: 500_000_000,
                scanned_at: Utc::now(),
            })
        }
        fn get_recommendations(
            &self,
            _metrics: &HealthMetrics,
        ) -> Vec<Recommendation> {
            vec![]
        }
        fn compare(
            &self,
            _previous: &HealthMetrics,
            _current: &HealthMetrics,
        ) -> String {
            "No change".into()
        }
    }

    #[test]
    fn test_calculate_health() {
        let use_case = CalculateHealthUseCase::new(Arc::new(MockCalc));
        let result = use_case.execute().unwrap();
        assert!((result.overall_score - 0.85).abs() < 0.001);
        assert_eq!(result.factors.len(), 1);
    }

    #[test]
    fn test_get_recommendations() {
        let use_case = CalculateHealthUseCase::new(Arc::new(MockCalc));
        let metrics = HealthMetrics {
            overall_score: 0.3,
            factors: vec![HealthFactor::new("free_space", 0.1, 0.3, "Low space")],
            total_files: 100,
            total_size_bytes: 1_000_000,
            free_space_bytes: 10_000,
            scanned_at: Utc::now(),
        };
        let recs = use_case.get_recommendations(&metrics);
        assert!(recs.is_empty());
    }
}
