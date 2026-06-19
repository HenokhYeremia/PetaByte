#[must_use]
pub fn is_windows() -> bool {
    cfg!(target_os = "windows")
}

#[must_use]
pub fn is_macos() -> bool {
    cfg!(target_os = "macos")
}

#[must_use]
pub fn is_linux() -> bool {
    cfg!(target_os = "linux")
}

#[must_use]
pub fn path_separator() -> &'static str {
    if cfg!(target_os = "windows") {
        "\\"
    } else {
        "/"
    }
}

#[must_use]
pub fn line_ending() -> &'static str {
    if cfg!(target_os = "windows") {
        "\r\n"
    } else {
        "\n"
    }
}

#[must_use]
pub fn default_app_data_dir() -> String {
    if cfg!(target_os = "windows") {
        std::env::var("LOCALAPPDATA")
            .unwrap_or_else(|_| "C:\\Users\\Default\\AppData\\Local".to_string())
    } else if cfg!(target_os = "macos") {
        std::env::var("HOME").map_or_else(
            |_| "/tmp".to_string(),
            |h| format!("{h}/Library/Application Support"),
        )
    } else {
        std::env::var("HOME").map_or_else(|_| "/tmp".to_string(), |h| format!("{h}/.local/share"))
    }
}
