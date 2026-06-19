pub mod adapters;
pub mod commands;
pub mod events;
pub mod menu;
pub mod state;
mod wiring;

use tauri::Manager;

#[must_use]
pub fn create_builder() -> tauri::Builder<tauri::Wry> {
    tauri::Builder::default()
        .setup(|app| {
            let handle = app.handle().clone();
            let app_state = wiring::build_app_state(handle);
            app.manage(app_state);
            let _ = menu::build_menu(app).map(|m| app.set_menu(m));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::start_scan,
            commands::cancel_scan,
            commands::get_scan_status,
            commands::find_duplicates,
            commands::move_file,
            commands::undo_move,
            commands::move_history,
            commands::scan_cache,
            commands::clean_cache,
            commands::cache_total_size,
            commands::get_health_score,
            commands::get_health_recommendations,
            commands::get_entry_count,
        ])
}
