use petabyte_core_engine::dto::{MoveRequest, MoveResultDto};
use petabyte_shared_models::entities::MoveOperation;

use crate::state::AppState;

#[tauri::command]
pub async fn move_file(
    state: tauri::State<'_, AppState>,
    source_path: String,
    destination_path: String,
    file_size: u64,
    use_trash: bool,
) -> Result<MoveResultDto, String> {
    let request = MoveRequest {
        source_path,
        destination_path,
        file_size,
        use_trash,
    };
    state.move_uc.move_file(&request).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn undo_move(
    state: tauri::State<'_, AppState>,
    operation_id: String,
) -> Result<(), String> {
    let id = uuid::Uuid::parse_str(&operation_id).map_err(|e| format!("Invalid UUID: {}", e))?;
    state.move_uc.undo(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn move_history(
    state: tauri::State<'_, AppState>,
    limit: usize,
) -> Result<Vec<MoveOperation>, String> {
    state.move_uc.get_history(limit).map_err(|e| e.to_string())
}
