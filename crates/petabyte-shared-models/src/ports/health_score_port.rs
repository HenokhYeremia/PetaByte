use crate::entities::{HealthMetrics, Recommendation};

pub trait HealthScorePort: Send + Sync {
    fn calculate(&self) -> Result<HealthMetrics, String>;
    fn get_recommendations(&self, metrics: &HealthMetrics) -> Vec<Recommendation>;
    fn compare(&self, previous: &HealthMetrics, current: &HealthMetrics) -> String;
}
