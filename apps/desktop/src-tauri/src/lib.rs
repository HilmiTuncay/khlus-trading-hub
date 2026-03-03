use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            // System Tray — Discord benzeri menu
            let show = MenuItem::with_id(app, "show", "Khlus Trading Hub'i Ac", true, None::<&str>)?;
            let separator = PredefinedMenuItem::separator(app)?;
            let quit = MenuItem::with_id(app, "quit", "Cikis", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &separator, &quit])?;

            let mut builder = TrayIconBuilder::new()
                .menu(&menu)
                .menu_on_left_click(false)
                .tooltip("Khlus Trading Hub")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    // Sol tik: pencereyi goster/gizle toggle
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.unminimize();
                                let _ = window.set_focus();
                            }
                        }
                    }
                });

            // Default icon varsa ekle
            if let Some(icon) = app.default_window_icon().cloned() {
                builder = builder.icon(icon);
            }

            // Tray icon basarisiz olursa bile uygulama acilsin
            if let Err(e) = builder.build(app) {
                eprintln!("Tray icon olusturulamadi: {}", e);
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            // X tusuna basinca: pencereyi gizle (tray'a kucult), uygulamayi kapatma
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("Uygulama baslatilirken hata olustu");
}
