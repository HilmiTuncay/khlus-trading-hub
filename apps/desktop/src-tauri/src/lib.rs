use tauri::{
    menu::{Menu, MenuItem},
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
            // System Tray
            let show = MenuItem::with_id(app, "show", "Goster", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Cikis", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &quit])?;

            let mut builder = TrayIconBuilder::new()
                .menu(&menu)
                .tooltip("Khlus Trading Hub")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
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
            // Pencere kapatildiginda uygulamayi tamamen kapat
            if let WindowEvent::CloseRequested { .. } = event {
                let app = window.app_handle();
                app.exit(0);
            }
        })
        .run(tauri::generate_context!())
        .expect("Uygulama baslatilirken hata olustu");
}
