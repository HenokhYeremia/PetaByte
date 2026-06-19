use std::time::Instant;

#[derive(Debug, Clone)]
pub struct Checkpoint {
    pub files_processed: u64,
    pub dirs_processed: u64,
    pub bytes_processed: u64,
    pub errors: u64,
    pub last_checkpoint_at: Instant,
    pub checkpoint_interval: usize,
    pub last_checkpoint_file_count: u64,
}

impl Checkpoint {
    pub fn new(checkpoint_interval: usize) -> Self {
        Self {
            files_processed: 0,
            dirs_processed: 0,
            bytes_processed: 0,
            errors: 0,
            last_checkpoint_at: Instant::now(),
            checkpoint_interval,
            last_checkpoint_file_count: 0,
        }
    }

    pub fn should_checkpoint(&self) -> bool {
        let files_since_last = self.files_processed - self.last_checkpoint_file_count;
        let elapsed = self.last_checkpoint_at.elapsed().as_secs();
        files_since_last >= self.checkpoint_interval as u64 || elapsed >= 30
    }

    pub fn mark_checkpoint(&mut self) {
        self.last_checkpoint_at = Instant::now();
        self.last_checkpoint_file_count = self.files_processed;
    }

    pub fn reset(&mut self) {
        self.files_processed = 0;
        self.dirs_processed = 0;
        self.bytes_processed = 0;
        self.errors = 0;
        self.last_checkpoint_at = Instant::now();
        self.last_checkpoint_file_count = 0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_checkpoint_interval() {
        let mut cp = Checkpoint::new(100);
        assert!(!cp.should_checkpoint());
        cp.files_processed = 50;
        assert!(!cp.should_checkpoint());
        cp.files_processed = 100;
        assert!(cp.should_checkpoint());
        cp.mark_checkpoint();
        assert!(!cp.should_checkpoint());
    }
}
