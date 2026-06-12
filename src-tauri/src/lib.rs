use notify::{Event, RecommendedWatcher, RecursiveMode, Watcher};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State};

pub struct WatcherState(pub Mutex<Option<RecommendedWatcher>>);

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    read_file_impl(&path)
}

#[tauri::command]
fn watch_file(
    path: String,
    app: AppHandle,
    state: State<'_, WatcherState>,
) -> Result<(), String> {
    let app_clone = app.clone();
    let watch_path = path.clone();

    let mut watcher = notify::recommended_watcher(move |res: Result<Event, _>| {
        if let Ok(event) = res {
            use notify::EventKind::*;
            if matches!(event.kind, Modify(_) | Create(_)) {
                let _ = app_clone.emit("file-changed", &watch_path);
            }
        }
    })
    .map_err(|e| e.to_string())?;

    watcher
        .watch(std::path::Path::new(&path), RecursiveMode::NonRecursive)
        .map_err(|e| e.to_string())?;

    *state.0.lock().unwrap() = Some(watcher);
    Ok(())
}

#[tauri::command]
fn get_initial_file() -> Option<String> {
    std::env::args().nth(1)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .manage(WatcherState(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![
            read_file,
            watch_file,
            get_initial_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn read_file_impl(path: &str) -> Result<String, String> {
    std::fs::read_to_string(path).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn test_read_file_success() {
        let mut tmp = tempfile::NamedTempFile::new().unwrap();
        writeln!(tmp, "# Hello\n\nWorld").unwrap();
        let result = read_file_impl(tmp.path().to_str().unwrap());
        assert!(result.is_ok());
        let content = result.unwrap();
        assert!(content.contains("Hello"));
        assert!(content.contains("World"));
    }

    #[test]
    fn test_read_file_not_found() {
        let result = read_file_impl("/nonexistent/path/file.md");
        assert!(result.is_err());
    }

    #[test]
    fn test_read_file_empty() {
        let tmp = tempfile::NamedTempFile::new().unwrap();
        let result = read_file_impl(tmp.path().to_str().unwrap());
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "");
    }

    #[test]
    fn test_read_file_unicode() {
        let mut tmp = tempfile::NamedTempFile::new().unwrap();
        writeln!(tmp, "# 繁體中文\n\n測試 mermaid 支援").unwrap();
        let result = read_file_impl(tmp.path().to_str().unwrap());
        assert!(result.is_ok());
        assert!(result.unwrap().contains("繁體中文"));
    }
}
