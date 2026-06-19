use std::sync::Arc;

use petabyte_database::connection::ConnectionManager;
use petabyte_health_score::{ScoringEngine, TrendAnalyzer, RecommendationEngine, ScoringConfig};
use petabyte_shared_models::entities::{HealthMetrics, Recommendation};
use petabyte_shared_models::ports::HealthScorePort;

pub struct AppHealthCalculator {
    scoring: ScoringEngine,
    trend: TrendAnalyzer,
    rec_engine: RecommendationEngine,
    conn: Arc<ConnectionManager>,
}

impl AppHealthCalculator {
    pub fn new(config: ScoringConfig, conn: Arc<ConnectionManager>) -> Self {
        Self {
            scoring: ScoringEngine::new(config),
            trend: TrendAnalyzer::new(),
            rec_engine: RecommendationEngine::new(),
            conn,
        }
    }
}

impl HealthScorePort for AppHealthCalculator {
    fn calculate(&self) -> Result<HealthMetrics, String> {
        let db = self.conn.connection();

        let total_files: u64 = db
            .query_row(
                "SELECT COALESCE(COUNT(*), 0) FROM scan_files WHERE is_directory = 0",
                [],
                |row| row.get(0),
            )
            .map_err(|e| format!("Failed to count files: {}", e))?;

        let total_dirs: u64 = db
            .query_row(
                "SELECT COALESCE(COUNT(*), 0) FROM scan_files WHERE is_directory = 1",
                [],
                |row| row.get(0),
            )
            .map_err(|e| format!("Failed to count dirs: {}", e))?;

        let total_size: u64 = db
            .query_row(
                "SELECT COALESCE(SUM(file_size), 0) FROM scan_files WHERE is_directory = 0",
                [],
                |row| row.get(0),
            )
            .map_err(|e| format!("Failed to sum sizes: {}", e))?;

        let duplicate_bytes: u64 = db
            .query_row(
                "SELECT COALESCE(SUM(total_wasted_bytes), 0) FROM duplicate_groups",
                [],
                |row| row.get(0),
            )
            .map_err(|e| format!("Failed to sum duplicates: {}", e))?;

        let temp_file_bytes: u64 = db
            .query_row(
                "SELECT COALESCE(SUM(file_size), 0) FROM scan_files WHERE is_directory = 0 AND (file_name LIKE '%.tmp' OR file_name LIKE '%.temp' OR file_name LIKE '%.bak' OR file_name LIKE '%.swp' OR file_name LIKE '%.log' OR file_name LIKE '%.cache' OR file_name LIKE '%~')",
                [],
                |row| row.get(0),
            )
            .map_err(|e| format!("Failed to sum temps: {}", e))?;

        let large_file_bytes: u64 = db
            .query_row(
                "SELECT COALESCE(SUM(file_size), 0) FROM scan_files WHERE is_directory = 0 AND file_size > 104857600",
                [],
                |row| row.get(0),
            )
            .map_err(|e| format!("Failed to sum large files: {}", e))?;

        let free_space_bytes = 0u64;
        let total_capacity_bytes = 0u64;

        let metrics = self.scoring.calculate(
            total_files,
            total_dirs,
            total_size,
            free_space_bytes,
            total_capacity_bytes,
            duplicate_bytes,
            temp_file_bytes,
            large_file_bytes,
        );

        Ok(metrics)
    }

    fn get_recommendations(&self, metrics: &HealthMetrics) -> Vec<Recommendation> {
        self.rec_engine.generate(metrics)
    }

    fn compare(&self, previous: &HealthMetrics, current: &HealthMetrics) -> String {
        self.trend.compare(previous, current)
    }
}
