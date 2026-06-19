pub mod scoring_engine;
pub mod factors;
pub mod trend_analyzer;
pub mod recommendation_engine;
pub mod config;
pub mod error;

pub use scoring_engine::ScoringEngine;
pub use trend_analyzer::TrendAnalyzer;
pub use recommendation_engine::RecommendationEngine;
pub use config::ScoringConfig;
pub use error::{HealthScoreError, HealthScoreResult};
