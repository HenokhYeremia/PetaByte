use crate::value_objects::{FileCategory, FilePath};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct FileEntry {
    pub file_path: FilePath,
    pub parent_path: Option<FilePath>,
    pub file_name: String,
    pub extension: Option<String>,
    pub file_size: u64,
    pub is_directory: bool,
    pub is_symlink: bool,
    pub permissions: u32,
    pub modified_at: i64,
    pub depth: u32,
    pub category: FileCategory,
}

impl FileEntry {
    pub fn new(
        file_path: FilePath,
        parent_path: Option<FilePath>,
        file_name: String,
        extension: Option<String>,
        file_size: u64,
        is_directory: bool,
        is_symlink: bool,
        permissions: u32,
        modified_at: i64,
        depth: u32,
    ) -> Self {
        let category = if is_directory {
            FileCategory::Other
        } else {
            FileCategory::from_extension(extension.as_deref())
        };

        Self {
            file_path,
            parent_path,
            file_name,
            extension,
            file_size,
            is_directory,
            is_symlink,
            permissions,
            modified_at,
            depth,
            category,
        }
    }
}
