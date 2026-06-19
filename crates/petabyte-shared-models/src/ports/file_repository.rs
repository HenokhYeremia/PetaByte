pub trait FileRepository: Send + Sync {
    fn insert_batch(&self, entries: &[crate::entities::FileEntry]) -> Result<(), String>;
    fn get_entry_count(&self) -> Result<u64, String>;
}
