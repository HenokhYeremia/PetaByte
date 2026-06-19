use crate::state::AppState;

#[tauri::command]
pub async fn get_entry_count(state: tauri::State<'_, AppState>) -> Result<u64, String> {
    state
        .find_large_uc
        .execute(0, 0)
        .map(|_| 0u64)
        .map_err(|e| e.to_string())
}
