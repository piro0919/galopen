use crate::calendar::{has_permission, sync_events, CalendarState};
use crate::meeting_url::extract_meeting_url;
use chrono::{DateTime, Utc};
use std::collections::HashSet;
use std::sync::Mutex;
use std::time::Duration;
use tauri::Manager;
use tauri_plugin_store::StoreExt;

const POLL_INTERVAL_SECS: u64 = 5 * 60; // 5 minutes
const CHECK_INTERVAL_SECS: u64 = 10; // Reduced from 30 for more responsive tray updates
const DEFAULT_MINUTES_BEFORE: i64 = 1;
const DEFAULT_TRAY_COUNTDOWN_MINUTES: i64 = 30;

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

        // Update tray title with countdown to next event
        update_tray_title(&app, &events);
    }
}

fn update_tray_title(app: &tauri::AppHandle, events: &[crate::calendar::CalendarEvent]) {
    let tray_countdown_minutes = app
        .store("settings.json")
        .ok()
        .and_then(|store| store.get("trayCountdownMinutes"))
        .and_then(|v| v.as_i64())
        .unwrap_or(DEFAULT_TRAY_COUNTDOWN_MINUTES);

    let now = Utc::now();

    // Find next non-all-day event that starts in the future
    // Use filter + min_by to explicitly find the closest future event
    let next_event_with_start = events
        .iter()
        .filter(|e| !e.is_all_day)
        .filter_map(|e| {
            parse_event_time(&e.start.date_time).map(|start| (e, start))
        })
        .filter(|(_, start)| *start > now)
        .min_by_key(|(_, start)| *start);

    let title = if let Some((event, start)) = next_event_with_start {
        let seconds_until = (start - now).num_seconds();
        let mins = ((seconds_until + 59) / 60) as i64; // ceil division

        log::debug!(
            "Tray countdown: event='{}', start={}, now={}, seconds_until={}, mins={}",
            event.summary,
            start,
            now,
            seconds_until,
            mins
        );

        // 0 = always show, otherwise show only within threshold
        if tray_countdown_minutes == 0 || mins <= tray_countdown_minutes {
            let formatted = format_tray_duration(mins);
            // Return None if formatted is empty (mins <= 0) to clear tray title
            if formatted.is_empty() { None } else { Some(formatted) }
        } else {
            None
        }
    } else {
        None
    };

    if let Some(tray) = app.tray_by_id("main") {
        let _ = tray.set_title(title.as_deref());
    }
}

fn format_tray_duration(mins: i64) -> String {
    let is_ja = sys_locale::get_locale()
        .map(|l| l.starts_with("ja"))
        .unwrap_or(false);

    if mins <= 0 {
        return String::new();
    }

    if is_ja {
        if mins < 60 {
            format!("{}分", mins)
        } else {
            let h = mins / 60;
            let m = mins % 60;
            if m == 0 {
                format!("{}時間", h)
            } else {
                format!("{}時間{}分", h, m)
            }
        }
    } else {
        if mins < 60 {
            format!("{}m", mins)
        } else {
            let h = mins / 60;
            let m = mins % 60;
            if m == 0 {
                format!("{}h", h)
            } else {
                format!("{}h{}m", h, m)
            }
        }
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
