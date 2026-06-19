use serde::{Deserialize, Serialize};
use std::fmt;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Hash)]
pub enum FileCategory {
    Document,
    Image,
    Video,
    Audio,
    Cache,
    Temp,
    Archive,
    System,
    Other,
}

impl FileCategory {
    #[must_use]
    pub fn from_extension(ext: Option<&str>) -> Self {
        let ext = ext.map(str::to_lowercase);
        let ext_str = ext.as_deref();
        match ext_str {
            Some(
                "doc" | "docx" | "xls" | "xlsx" | "ppt" | "pptx" | "pdf" | "txt" | "rtf" | "odt"
                | "ods" | "odp" | "csv" | "md" | "tex" | "epub",
            ) => Self::Document,

            Some(
                "jpg" | "jpeg" | "png" | "gif" | "bmp" | "svg" | "webp" | "ico" | "tiff" | "tif"
                | "psd" | "ai" | "raw" | "heic" | "avif",
            ) => Self::Image,

            Some(
                "mp4" | "avi" | "mkv" | "mov" | "wmv" | "flv" | "webm" | "m4v" | "mpg" | "mpeg"
                | "3gp" | "ts",
            ) => Self::Video,

            Some(
                "mp3" | "wav" | "flac" | "aac" | "ogg" | "wma" | "m4a" | "opus" | "mid" | "midi",
            ) => Self::Audio,

            Some("zip" | "rar" | "tar" | "gz" | "bz2" | "xz" | "7z" | "iso" | "tgz" | "zst") => {
                Self::Archive
            }

            Some("cache" | "tmp") => Self::Cache,
            Some("temp" | "log") => Self::Temp,

            Some("exe" | "dll" | "so" | "dylib" | "sys" | "drv" | "bin") => Self::System,

            _ => Self::Other,
        }
    }
}

impl fmt::Display for FileCategory {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Document => write!(f, "Document"),
            Self::Image => write!(f, "Image"),
            Self::Video => write!(f, "Video"),
            Self::Audio => write!(f, "Audio"),
            Self::Cache => write!(f, "Cache"),
            Self::Temp => write!(f, "Temp"),
            Self::Archive => write!(f, "Archive"),
            Self::System => write!(f, "System"),
            Self::Other => write!(f, "Other"),
        }
    }
}
