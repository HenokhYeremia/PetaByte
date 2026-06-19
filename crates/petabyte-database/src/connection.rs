use parking_lot::Mutex;
use rusqlite::Connection;

pub struct ConnectionManager {
    conn: Mutex<Connection>,
}

impl ConnectionManager {
    pub fn open(path: &str) -> Result<Self, crate::error::DatabaseError> {
        let conn = Connection::open(path)?;
        conn.execute_batch(
            "PRAGMA journal_mode=WAL;
             PRAGMA synchronous=NORMAL;
             PRAGMA foreign_keys=ON;
             PRAGMA cache_size=-64000;",
        )?;
        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    pub fn open_in_memory() -> Result<Self, crate::error::DatabaseError> {
        let conn = Connection::open_in_memory()?;
        conn.execute_batch(
            "PRAGMA journal_mode=WAL;
             PRAGMA synchronous=NORMAL;
             PRAGMA foreign_keys=ON;",
        )?;
        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    pub fn connection(&self) -> parking_lot::MutexGuard<'_, Connection> {
        self.conn.lock()
    }

    pub fn run_migration(&self, sql: &str) -> Result<(), crate::error::DatabaseError> {
        let conn = self.conn.lock();
        conn.execute_batch(sql)?;
        Ok(())
    }
}
