/*  This file is entirely AI-generated, as I do not have the capabilities to
    write rust code.
*/

use crate::window_shortcut_settings::{self, WindowShortcutSettings};
use serde::Serialize;
use std::sync::{
    atomic::{AtomicBool, AtomicU64, Ordering},
    Mutex,
};
use tauri::{Emitter, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};
#[cfg(windows)]
use windows_sys::Win32::UI::WindowsAndMessaging::GetForegroundWindow;

#[derive(Default)]
struct WindowShortcutRuntime {
    current: Mutex<RuntimeSettings>,
    active_id: AtomicU64,
    paused: AtomicBool,
}

#[derive(Default)]
struct RuntimeSettings {
    settings: WindowShortcutSettings,
    registered: Option<Shortcut>,
    available: bool,
    error: Option<String>,
}

#[derive(Serialize)]
pub struct WindowShortcutStatus {
    settings: WindowShortcutSettings,
    active: bool,
    available: bool,
    error: Option<String>,
}

fn status(current: &RuntimeSettings) -> WindowShortcutStatus {
    WindowShortcutStatus {
        settings: current.settings.clone(),
        active: current.registered.is_some(),
        available: current.available,
        error: current.error.clone(),
    }
}

// Zero means disabled. Adding one keeps even shortcut ID zero usable.
fn binding_id(shortcut: Shortcut) -> u64 {
    u64::from(shortcut.id()) + 1
}

fn register_shortcut(
    app: &tauri::AppHandle,
    shortcut: Shortcut,
) -> Result<(), String> {
    let id = binding_id(shortcut);
    let ignore_release = AtomicBool::new(false);

    app.global_shortcut()
        .on_shortcut(shortcut, move |app, shortcut, event| {
            let runtime = app.state::<WindowShortcutRuntime>();

            if event.state == ShortcutState::Pressed {
                // Remember capture mode for this gesture, even if capture
                // finishes before the native key-release event arrives.
                ignore_release.store(
                    runtime.paused.load(Ordering::Acquire)
                        || runtime.active_id.load(Ordering::Acquire) != id,
                    Ordering::Release,
                );

                // Windows may consume a registered shortcut before the
                // webview receives keydown. Forward it during capture.
                if runtime.paused.load(Ordering::Acquire)
                    && runtime.active_id.load(Ordering::Acquire) == id
                {
                    let _ = app.emit_to(
                        "main",
                        "window-shortcut-captured",
                        (*shortcut).into_string(),
                    );
                }

                return;
            }

            if event.state != ShortcutState::Released
                || ignore_release.swap(false, Ordering::AcqRel)
                || runtime.paused.load(Ordering::Acquire)
                || runtime.active_id.load(Ordering::Acquire) != id
            {
                return;
            }

            // The callback never locks current: registration and window
            // operations can wait for the UI thread, so sharing that lock
            // here could deadlock when changing the binding.
            if let Err(error) = toggle_window(app) {
                log::warn!("Could not toggle the drafting window: {error}");
            }
        })
        .map_err(|error| format!("Could not register shortcut: {error}"))
}

pub fn install(app: &tauri::App) -> Result<(), String> {
    // Keep settings commands available even if loading or registration fails.
    app.manage(WindowShortcutRuntime::default());
    let runtime = app.state::<WindowShortcutRuntime>();

    let result = (|| -> Result<(), String> {
        app.handle()
            .plugin(tauri_plugin_global_shortcut::Builder::new().build())
            .map_err(|error| error.to_string())?;

        let mut current = runtime.current.lock()
            .map_err(|error| error.to_string())?;

        current.available = true;
        current.settings = window_shortcut_settings::load(app.handle())
            .map_err(|error| error.to_string())?;

        if current.settings.enabled {
            let shortcut = current.settings.shortcut.parse::<Shortcut>()
                .map_err(|error| error.to_string())?;

            register_shortcut(app.handle(), shortcut)?;
            current.registered = Some(shortcut);
            runtime.active_id.store(binding_id(shortcut), Ordering::Release);
        }

        Ok(())
    })();

    if let Err(error) = &result {
        if let Ok(mut current) = runtime.current.lock() {
            current.error = Some(error.clone());
        }
    }

    result
}

// Async commands run outside the UI thread, which must stay free to process
// the native shortcut registration requests made below.
#[tauri::command]
pub async fn get_window_shortcut_settings(
    app: tauri::AppHandle,
) -> Result<WindowShortcutStatus, String> {
    let runtime = app.state::<WindowShortcutRuntime>();
    let current = runtime.current.lock()
        .map_err(|error| error.to_string())?;

    Ok(status(&current))
}

#[tauri::command]
pub async fn set_window_shortcut_paused(
    app: tauri::AppHandle,
    paused: bool,
) -> Result<(), String> {
    app.state::<WindowShortcutRuntime>()
        .paused
        .store(paused, Ordering::Release);

    Ok(())
}

#[tauri::command]
pub async fn set_window_shortcut_settings(
    app: tauri::AppHandle,
    mut settings: WindowShortcutSettings,
) -> Result<WindowShortcutStatus, String> {
    settings.shortcut = settings.shortcut.trim().to_string();

    let parsed = settings.shortcut.parse::<Shortcut>()
        .map_err(|error| format!("Invalid shortcut: {error}"))?;

    let runtime = app.state::<WindowShortcutRuntime>();
    let mut current = runtime.current.lock()
        .map_err(|error| error.to_string())?;

    if !current.available {
        return Err(
            "The global shortcut service is unavailable. Restart the app.".into()
        );
    }

    let next = settings.enabled.then_some(parsed);
    let newly_registered = next.is_some() && next != current.registered;

    // Register the replacement first. If the OS rejects it, the old binding
    // and saved preferences remain untouched. It stays inactive until saved.
    if newly_registered {
        register_shortcut(&app, parsed)?;
    }

    if let Err(error) = window_shortcut_settings::save(&app, &settings) {
        let mut message = format!("Could not save shortcut settings: {error}");

        if newly_registered {
            if let Err(cleanup_error) = app.global_shortcut().unregister(parsed) {
                message.push_str(&format!(
                    " The unused binding could not be released; restart the app: {cleanup_error}"
                ));
            }
        }

        return Err(message);
    }

    let previous = current.registered;

    runtime.active_id.store(
        next.map(binding_id).unwrap_or(0),
        Ordering::Release,
    );

    current.settings = settings;
    current.registered = next;
    current.error = None;

    if previous != next {
        if let Some(previous) = previous {
            if let Err(error) = app.global_shortcut().unregister(previous) {
                // The ID gate prevents the obsolete binding from toggling
                // the window even if the OS cannot unregister it.
                let message = format!(
                    "Settings saved, but the old binding could not be released. Restart the app: {error}"
                );

                log::warn!("{message}");
                current.error = Some(message);
            }
        }
    }

    Ok(status(&current))
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