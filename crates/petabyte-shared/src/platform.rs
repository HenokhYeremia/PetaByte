pub fn is_windows() -> bool {
    cfg!(target_os = "windows")
}

pub fn is_macos() -> bool {
    cfg!(target_os = "macos")
}

pub fn is_linux() -> bool {
    cfg!(target_os = "linux")
}

pub fn path_separator() -> &'static str {
    if cfg!(target_os = "windows") {
        "\\"
    } else {
        "/"
    }
}

pub fn line_ending() -> &'static str {
    if cfg!(target_os = "windows") {
        "\r\n"
    } else {
        "\n"
    }
}

pub fn default_app_data_dir() -> String {
    if cfg!(target_os = "windows") {
        std::env::var("LOCALAPPDATA")
            .unwrap_or_else(|_| "C:\\Users\\Default\\AppData\\Local".to_string())
    } else if cfg!(target_os = "macos") {
        std::env::var("HOME")
            .map(|h| format!("{}/Library/Application Support", h))
            .unwrap_or_else(|_| "/tmp".to_string())
    } else {
        std::env::var("HOME")
            .map(|h| format!("{}/.local/share", h))
            .unwrap_or_else(|_| "/tmp".to_string())
    }
}
