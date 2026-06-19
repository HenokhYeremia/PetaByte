use chrono::{DateTime, Utc};
use petabyte_shared_models::entities::{ScanSession, ScanStatus};
use rusqlite::Row;

pub struct ScanSessionRow;

impl ScanSessionRow {
    pub fn from_row(row: &Row<'_>) -> rusqlite::Result<ScanSession> {
        let status_str: String = row.get("status")?;
        let started_at_str: String = row.get("started_at")?;
        let completed_at_str: Option<String> = row.get("completed_at")?;

        let status = match status_str.as_str() {
            "Idle" => ScanStatus::Idle,
            "Pending" => ScanStatus::Pending,
            "Scanning" => ScanStatus::Scanning,
            "Paused" => ScanStatus::Paused,
            "Cancelled" => ScanStatus::Cancelled,
            "Completed" => ScanStatus::Completed,
            "Failed" => ScanStatus::Failed,
            _ => ScanStatus::Idle,
        };

        let started_at = started_at_str
            .parse::<DateTime<Utc>>()
            .unwrap_or_else(|_| Utc::now());

        let completed_at = completed_at_str
            .map(|s| s.parse::<DateTime<Utc>>().unwrap_or_else(|_| Utc::now()));

        Ok(ScanSession {
            session_id: row.get("session_id")?,
            root_path: row.get("root_path")?,
            status,
            started_at,
            completed_at,
            total_files: row.get("total_files")?,
            total_dirs: row.get("total_dirs")?,
            total_size: row.get("total_size")?,
            total_errors: row.get("total_errors")?,
        })
    }

    pub fn insert_params(session: &ScanSession) -> Vec<Box<dyn rusqlite::types::ToSql>> {
        vec![
            Box::new(session.session_id.clone()),
            Box::new(session.root_path.clone()),
            Box::new(format!("{:?}", session.status)),
            Box::new(session.started_at.to_rfc3339()),
            Box::new(session.completed_at.map(|dt| dt.to_rfc3339())),
            Box::new(session.total_files as i64),
            Box::new(session.total_dirs as i64),
            Box::new(session.total_size as i64),
            Box::new(session.total_errors as i64),
        ]
    }

    pub fn update_params(session: &ScanSession) -> Vec<Box<dyn rusqlite::types::ToSql>> {
        vec![
            Box::new(format!("{:?}", session.status)),
            Box::new(session.completed_at.map(|dt| dt.to_rfc3339())),
            Box::new(session.total_files as i64),
            Box::new(session.total_dirs as i64),
            Box::new(session.total_size as i64),
            Box::new(session.total_errors as i64),
            Box::new(session.session_id.clone()),
        ]
    }
}
