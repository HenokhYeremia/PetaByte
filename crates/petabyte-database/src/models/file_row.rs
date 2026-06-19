use petabyte_shared_models::entities::FileEntry;

pub struct FileEntryRow;

impl FileEntryRow {
    #[must_use]
    pub fn insert_params(
        session_id: &str,
        entry: &FileEntry,
    ) -> Vec<Box<dyn rusqlite::types::ToSql>> {
        vec![
            Box::new(session_id.to_string()),
            Box::new(entry.file_path.to_string()),
            Box::new(
                entry
                    .parent_path
                    .as_ref()
                    .map(std::string::ToString::to_string),
            ),
            Box::new(entry.file_name.clone()),
            Box::new(entry.extension.clone()),
            Box::new(entry.file_size as i64),
            Box::new(i32::from(entry.is_directory)),
            Box::new(i32::from(entry.is_symlink)),
            Box::new(entry.permissions as i32),
            Box::new(entry.modified_at),
            Box::new(entry.depth as i32),
            Box::new(entry.category.to_string()),
        ]
    }

    #[must_use]
    pub fn insert_sql() -> &'static str {
        "INSERT OR IGNORE INTO scan_files
         (session_id, file_path, parent_path, file_name, extension,
          file_size, is_directory, is_symlink, permissions, modified_at,
          depth, category)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)"
    }
}
