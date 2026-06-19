use petabyte_core_engine::dto::CleanResultDto;

use crate::state::AppState;

#[tauri::command]
pub async fn scan_cache(
    state: tauri::State<'_, AppState>,
) -> Result<Vec<petabyte_shared_models::entities::CacheEntry>, String> {
    state.clean_uc.scan().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn clean_cache(state: tauri::State<'_, AppState>) -> Result<CleanResultDto, String> {
    state.clean_uc.clean().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn cache_total_size(state: tauri::State<'_, AppState>) -> Result<u64, String> {
    state
        .clean_uc
        .calculate_total_size()
        .map_err(|e| e.to_string())
}
