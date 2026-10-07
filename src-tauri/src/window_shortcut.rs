/*  This file is entirely AI-generated, as I do not have the capabilities to
    write rust code.
*/

use crate::window_shortcut_settings;
use tauri::Manager;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};
#[cfg(windows)]
use windows_sys::Win32::UI::WindowsAndMessaging::GetForegroundWindow;

pub fn install(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    app.handle()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())?;

    let settings = window_shortcut_settings::load(app.handle())?;
    if !settings.enabled {
        return Ok(());
    }

    app.global_shortcut()
        .on_shortcut(settings.shortcut.as_str(), |app, _shortcut, event| {
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

    #[cfg(windows)]
    let is_foreground = {
        let hwnd = window.hwnd()?.0;

        // Read the actual foreground window because Tauri's tracked
        // focus state can be incorrect before the first focus change.
        // SAFETY: This only reads and compares handles; neither is dereferenced.
        unsafe { GetForegroundWindow() == hwnd }
    };

    #[cfg(not(windows))]
    let is_foreground = window.is_focused()?;

    if is_foreground {
        window.minimize()?;
    } else {
        // Only restore a minimized window, preserving maximized state
        // when the app is already visible in the background.
        if window.is_minimized()? {
            window.unminimize()?;
        }

        window.show()?;
        window.set_focus()?;
    }

    Ok(())
}