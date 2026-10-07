use serde::{Deserialize, Serialize};
use std::{error::Error, fs, io::ErrorKind};
use tauri::Manager;
use tauri_plugin_global_shortcut::Shortcut;

const DEFAULT_SHORTCUT: &str = "Control+Shift+F8";

#[derive(Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct WindowShortcutSettings {
    pub enabled: bool,
    pub shortcut: String,
}

impl Default for WindowShortcutSettings {
    fn default() -> Self {
        Self {
            enabled: true,
            shortcut: DEFAULT_SHORTCUT.to_string(),
        }
    }
}

pub fn load(app: &tauri::AppHandle) -> Result<WindowShortcutSettings, Box<dyn Error>> {
    let directory = app.path().app_data_dir()?;
    let path = directory.join("window-shortcut.json");

    log::info!("Window shortcut settings: {}", path.display());

    let settings = match fs::read_to_string(&path) {
        Ok(contents) => serde_json::from_str::<WindowShortcutSettings>(&contents)?,
        Err(error) if error.kind() == ErrorKind::NotFound => {
            let defaults = WindowShortcutSettings::default();
            fs::create_dir_all(&directory)?;
            fs::write(&path, serde_json::to_string_pretty(&defaults)?)?;
            defaults
        }
        Err(error) => return Err(error.into()),
    };

    // Validate the saved binding before registering it with the OS.
    // Invalid preferences stay untouched; lib.rs logs the error and opens the app.
    settings.shortcut.parse::<Shortcut>()?;

    Ok(settings)
}