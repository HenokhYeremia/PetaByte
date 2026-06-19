use tauri::menu::{MenuBuilder, SubmenuBuilder};

pub fn build_menu(app: &tauri::App) -> Result<tauri::menu::Menu<tauri::Wry>, tauri::Error> {
    let file_menu = SubmenuBuilder::new(app, "File").quit().build()?;

    let edit_menu = SubmenuBuilder::new(app, "Edit")
        .undo()
        .redo()
        .separator()
        .cut()
        .copy()
        .paste()
        .build()?;

    let help_menu = SubmenuBuilder::new(app, "Help")
        .text("about", "About PetaByte")
        .build()?;

    let menu = MenuBuilder::new(app)
        .item(&file_menu)
        .item(&edit_menu)
        .item(&help_menu)
        .build()?;

    Ok(menu)
}
