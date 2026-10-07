/*  This file is entirely AI-generated, as I do not have the capabilities to
    write rust code.
*/

use tauri::Manager;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

const DEFAULT_SHORTCUT: &str = "Control+Shift+F8";

pub fn install(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    app.handle()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())?;

    app.global_shortcut()
        .on_shortcut(DEFAULT_SHORTCUT, |app, _shortcut, event| {
            // Toggle on release so one key gesture produces one action,
            // and the held shortcut does not type into the newly focused app.
            if event.state != ShortcutState::Released {
                return;
            }

            if let Err(error) = toggle_window(app) {
                log::warn!("Could not toggle the drafting window: {error}");
            }
        })?;

    Ok(())
}

fn toggle_window(app: &tauri::AppHandle) -> tauri::Result<()> {
    let Some(window) = app.get_webview_window("main") else {
        return Ok(());
    };

    if window.is_focused()? {
        window.minimize()?;
    } else {
        // Only restore a minimized window. Restoring an already maximized
        // window could otherwise change its current window state.
        if window.is_minimized()? {
            window.unminimize()?;
        }

        window.show()?;
        window.set_focus()?;
    }

    Ok(())
}