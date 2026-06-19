use std::path::{Path, PathBuf};

pub fn normalize_path(path: &Path) -> PathBuf {
    let path_str = path.to_string_lossy().replace('\\', "/");
    let path = Path::new(&path_str);
    let mut components = Vec::new();
    for component in path.components() {
        match component {
            std::path::Component::Normal(c) => components.push(c.to_os_string()),
            std::path::Component::ParentDir => {
                components.pop();
            }
            std::path::Component::RootDir => {
                if components.is_empty() {
                    components.push(component.as_os_str().to_os_string());
                }
            }
            std::path::Component::Prefix(p) => {
                if components.is_empty() {
                    components.push(p.as_os_str().to_os_string());
                }
            }
            std::path::Component::CurDir => {}
        }
    }
    let mut result = PathBuf::new();
    for c in components {
        result.push(c);
    }
    result
}

pub fn is_hidden(path: &Path) -> bool {
    path.file_name()
        .and_then(|n| n.to_str())
        .map(|s| s.starts_with('.') || s.starts_with("~$"))
        .unwrap_or(false)
}

pub fn is_system_directory(path: &Path) -> bool {
    let path_str = path.to_string_lossy().replace('\\', "/");
    crate::constants::SYSTEM_DIRECTORIES
        .iter()
        .any(|d| path_str.starts_with(d) || path_str == *d)
}

pub fn is_temp_extension(ext: &str) -> bool {
    matches!(
        ext.to_lowercase().as_str(),
        "tmp" | "temp" | "bak" | "swp" | "swo" | "~" | "log" | "cache"
    )
}
