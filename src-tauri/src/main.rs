fn main() {
    env_logger::init();
    petabyte_app::create_builder()
        .run(tauri::generate_context!())
        .expect("error while running PetaByte application");
}
