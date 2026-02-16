use crate::calendar::{has_permission, sync_events, CalendarState};
use crate::meeting_url::extract_meeting_url;
use chrono::{DateTime, Utc};
use std::collections::HashSet;
use std::sync::Mutex;
use std::time::Duration;
use tauri::Manager;
use tauri_plugin_store::StoreExt;

const POLL_INTERVAL_SECS: u64 = 5 * 60; // 5 minutes
const CHECK_INTERVAL_SECS: u64 = 30;
const DEFAULT_MINUTES_BEFORE: i64 = 1;

struct SchedulerState {
    opened_meetings: Mutex<HashSet<String>>,
    last_poll: Mutex<std::time::Instant>,
}

pub async fn run_scheduler(app: tauri::AppHandle) {
    let state = SchedulerState {
        opened_meetings: Mutex::new(HashSet::new()),
        last_poll: Mutex::new(std::time::Instant::now() - Duration::from_secs(POLL_INTERVAL_SECS)),
    };

    loop {
        tokio::time::sleep(Duration::from_secs(CHECK_INTERVAL_SECS)).await;

        let calendar_state = app.state::<CalendarState>();

        // Check if we have calendar permission
        if !has_permission(&calendar_state) {
            continue;
        }

        // Poll calendar if enough time has passed
        let should_poll = {
            let last = state.last_poll.lock().unwrap();
            last.elapsed() >= Duration::from_secs(POLL_INTERVAL_SECS)
        };

        if should_poll {
            if let Err(e) = sync_events(&calendar_state) {
                log::error!("Calendar sync failed: {}", e);
                continue;
            }
            *state.last_poll.lock().unwrap() = std::time::Instant::now();
        }

        // Read minutes_before setting from store
        let minutes_before = app
            .store("settings.json")
            .ok()
            .and_then(|store| store.get("minutesBefore"))
            .and_then(|v| v.as_i64())
            .unwrap_or(DEFAULT_MINUTES_BEFORE);

        // Check for upcoming meetings
        let events = calendar_state.events.lock().unwrap().clone();
        let now = Utc::now();

        for event in &events {
            let start_time = match parse_event_time(&event.start.date_time) {
                Some(t) => t,
                None => continue,
            };

            let minutes_until = (start_time - now).num_minutes();
            let seconds_until = (start_time - now).num_seconds();

            // Open if within minutes_before and not already started more than 2 minutes ago
            if seconds_until <= (minutes_before * 60) && minutes_until >= -2 {
                let already_opened = state
                    .opened_meetings
                    .lock()
                    .unwrap()
                    .contains(&event.id);

                if !already_opened {
                    if let Some(url) = extract_meeting_url(event) {
                        log::info!(
                            "Opening meeting: {} ({})",
                            event.summary,
                            url
                        );

                        // Send notification
                        let _ = send_notification(&app, &event.summary);

                        // Brief delay before opening
                        tokio::time::sleep(Duration::from_secs(3)).await;

                        // Open the URL
                        let _ = open::that(&url);

                        state
                            .opened_meetings
                            .lock()
                            .unwrap()
                            .insert(event.id.clone());
                    }
                }
            }
        }

        // Clean up old entries from opened_meetings (events no longer in today's list)
        let events_ref = calendar_state.events.lock().unwrap();
        let event_ids: HashSet<String> = events_ref.iter().map(|e| e.id.clone()).collect();
        state
            .opened_meetings
            .lock()
            .unwrap()
            .retain(|id| event_ids.contains(id));
    }
}

fn parse_event_time(date_time_str: &Option<String>) -> Option<DateTime<Utc>> {
    let s = date_time_str.as_ref()?;
    DateTime::parse_from_rfc3339(s)
        .ok()
        .map(|dt| dt.with_timezone(&Utc))
}

fn send_notification(app: &tauri::AppHandle, summary: &str) {
    use tauri_plugin_notification::NotificationExt;
    let is_ja = sys_locale::get_locale()
        .map(|l| l.starts_with("ja"))
        .unwrap_or(false);
    let body = if is_ja {
        format!("開始: {}", summary)
    } else {
        format!("Opening: {}", summary)
    };
    let _ = app.notification().builder().title("Galopen").body(body).show();
}
