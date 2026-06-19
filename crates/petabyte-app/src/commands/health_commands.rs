use petabyte_core_engine::dto::HealthResultDto;
use petabyte_shared_models::entities::{HealthMetrics, Recommendation};

use crate::state::AppState;

#[tauri::command]
pub async fn get_health_score(
    state: tauri::State<'_, AppState>,
) -> Result<HealthResultDto, String> {
    state.health_uc.execute().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_health_recommendations(
    state: tauri::State<'_, AppState>,
    metrics: HealthMetrics,
) -> Result<Vec<Recommendation>, String> {
    Ok(state.health_uc.get_recommendations(&metrics))
}
