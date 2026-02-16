use tauri::{
    image::Image,
    menu::{MenuBuilder, MenuItemBuilder},
    tray::TrayIconBuilder,
    Manager,
};
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons};
use tauri_plugin_updater::UpdaterExt;

mod calendar;
mod meeting_url;
mod scheduler;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .manage(calendar::CalendarState::new())
        .invoke_handler(tauri::generate_handler![
            calendar::check_calendar_permission,
            calendar::request_calendar_permission,
            calendar::get_calendars,
            calendar::get_todays_events,
            calendar::force_sync,
        ])
        .setup(|app| {
            // Hide dock icon - menu bar only app
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            let is_ja = sys_locale::get_locale()
                .map(|l| l.starts_with("ja"))
                .unwrap_or(false);

            // Build tray menu
            let quit_label = if is_ja { "Galopen を終了" } else { "Quit Galopen" };
            let show_label = if is_ja { "ウインドウを表示" } else { "Show Window" };
            let quit = MenuItemBuilder::with_id("quit", quit_label).build(app)?;
            let show = MenuItemBuilder::with_id("show", show_label).build(app)?;
            let menu = MenuBuilder::new(app).items(&[&show, &quit]).build()?;

            // Build tray icon with dedicated monochrome template icon
            let tray_icon = Image::from_bytes(include_bytes!("../icons/tray-icon@2x.png"))?;
            let _tray = TrayIconBuilder::new()
                .icon(tray_icon)
                .icon_as_template(true)
                .menu(&menu)
                .on_menu_event(move |app, event| match event.id().as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .build(app)?;

            // Start background scheduler
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                scheduler::run_scheduler(app_handle).await;
            });

            // Check for updates in background
            let update_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                check_for_updates(update_handle, is_ja).await;
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

async fn check_for_updates(app: tauri::AppHandle, is_ja: bool) {
    let updater = match app.updater() {
        Ok(u) => u,
        Err(_) => return,
    };
    let update = match updater.check().await {
        Ok(Some(u)) => u,
        _ => return,
    };

    let title = if is_ja { "アップデート" } else { "Update" };
    let msg = if is_ja {
        format!(
            "新しいバージョン v{} が利用可能です。\nアップデートしますか？",
            update.version
        )
    } else {
        format!(
            "Version v{} is available.\nWould you like to update?",
            update.version
        )
    };
    let cancel = if is_ja { "キャンセル" } else { "Cancel" };

    let confirmed = app
        .dialog()
        .message(msg)
        .title(title)
        .buttons(MessageDialogButtons::OkCancelCustom(
            "OK".to_string(),
            cancel.to_string(),
        ))
        .blocking_show();

    if !confirmed {
        return;
    }

    let bytes = match update
        .download(|_, _| {}, || {})
        .await
    {
        Ok(b) => b,
        Err(e) => {
            let err_msg = if is_ja {
                format!("ダウンロードに失敗しました。\n{}", e)
            } else {
                format!("Download failed.\n{}", e)
            };
            app.dialog()
                .message(err_msg)
                .title(title)
                .blocking_show();
            return;
        }
    };

    match update.install(bytes) {
        Ok(_) => {
            let done_msg = if is_ja {
                "アップデートが完了しました。\nアプリを再起動してください。"
            } else {
                "Update complete.\nPlease restart the app."
            };
            app.dialog()
                .message(done_msg)
                .title(title)
                .blocking_show();
            app.exit(0);
        }
        Err(e) => {
            let err_msg = if is_ja {
                format!("インストールに失敗しました。\n{}", e)
            } else {
                format!("Installation failed.\n{}", e)
            };
            app.dialog()
                .message(err_msg)
                .title(title)
                .blocking_show();
        }
    }
}
