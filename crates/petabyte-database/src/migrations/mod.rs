mod m001_initial;
mod m002_indexes;
mod m003_duplicates;

pub use m001_initial::*;

pub fn run_all(conn: &crate::connection::ConnectionManager) -> Result<(), crate::error::DatabaseError> {
    m001_initial::run_initial_migration(conn)?;
    m003_duplicates::run_duplicate_migration(conn)?;
    Ok(())
}
