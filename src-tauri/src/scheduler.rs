use crate::calendar::{has_permission, sync_events, CalendarState};
use crate::meeting_url::{detect_meeting_service, extract_meeting_url};
use crate::mic;
use chrono::{DateTime, Utc};
use std::collections::HashSet;
use std::sync::Mutex;
use std::time::Duration;
use tauri::Manager;
use tauri_plugin_store::StoreExt;

const POLL_INTERVAL_SECS: u64 = 5 * 60; // 5 minutes
const CHECK_INTERVAL_SECS: u64 = 10; // Reduced from 30 for more responsive tray updates
const DEFAULT_MINUTES_BEFORE: i64 = 1;
const DEFAULT_NOTIFY_MINUTES_BEFORE: i64 = 5;
const DEFAULT_TRAY_COUNTDOWN_MINUTES: i64 = 30;

/// Check if the current system locale is Japanese
fn is_japanese_locale() -> bool {
    sys_locale::get_locale()
        .map(|l| l.starts_with("ja"))
        .unwrap_or(false)
}

struct SchedulerState {
    opened_meetings: Mutex<HashSet<String>>,
    notified_meetings: Mutex<HashSet<String>>,
    /// Meetings held back because the user was on another call when they were due.
    waiting_meetings: Mutex<HashSet<String>>,
    last_poll: Mutex<std::time::Instant>,
}

pub async fn run_scheduler(app: tauri::AppHandle) {
    let state = SchedulerState {
        opened_meetings: Mutex::new(HashSet::new()),
        notified_meetings: Mutex::new(HashSet::new()),
        waiting_meetings: Mutex::new(HashSet::new()),
        last_poll: Mutex::new(std::time::Instant::now() - Duration::from_secs(POLL_INTERVAL_SECS)),
    };

    loop {
        tokio::time::sleep(Duration::from_secs(CHECK_INTERVAL_SECS)).await;

        let calendar_state = app.state::<CalendarState>();

        // Check if we have calendar permission
        if !has_permission(&calendar_state) {
            continue;
        }

        // Poll calendar if enough time has passed.
        // Recover from Mutex poisoning so a panic in one branch doesn't kill the scheduler.
        let should_poll = {
            let last = state.last_poll.lock().unwrap_or_else(|e| e.into_inner());
            last.elapsed() >= Duration::from_secs(POLL_INTERVAL_SECS)
        };

        if should_poll {
            if let Err(e) = sync_events(&calendar_state) {
                log::error!("Calendar sync failed: {}", e);
                continue;
            }
            *state.last_poll.lock().unwrap_or_else(|e| e.into_inner()) =
                std::time::Instant::now();
        }

        // Read minutes_before setting from store
        let minutes_before = app
            .store("settings.json")
            .ok()
            .and_then(|store| store.get("minutesBefore"))
            .and_then(|v| v.as_i64())
            .unwrap_or(DEFAULT_MINUTES_BEFORE);

        let notify_minutes_before = app
            .store("settings.json")
            .ok()
            .and_then(|store| store.get("notificationMinutesBefore"))
            .and_then(|v| v.as_i64())
            .unwrap_or(DEFAULT_NOTIFY_MINUTES_BEFORE);

        // "wait" (default): hold a meeting back while the user is on another one.
        // "open": open it anyway, as before.
        let wait_while_in_meeting = app
            .store("settings.json")
            .ok()
            .and_then(|store| store.get("whenInMeeting"))
            .and_then(|v| v.as_str().map(|s| s != "open"))
            .unwrap_or(true);

        // Check for upcoming meetings
        let events = calendar_state
            .events
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .clone();
        let now = Utc::now();

        for event in &events {
            let start_time = match parse_event_time(&event.start.date_time) {
                Some(t) => t,
                None => continue,
            };

            let minutes_until = (start_time - now).num_minutes();
            let seconds_until = (start_time - now).num_seconds();

            // Reminder notification (independent of URL auto-open)
            if notify_minutes_before > 0
                && seconds_until <= (notify_minutes_before * 60)
                && minutes_until >= -2
            {
                let already_notified = state
                    .notified_meetings
                    .lock()
                    .unwrap_or_else(|e| e.into_inner())
                    .contains(&event.id);

                if !already_notified {
                    let mins_until_display = ((seconds_until + 59) / 60).max(0);
                    if let Err(e) =
                        send_reminder_notification(&app, &event.summary, mins_until_display)
                    {
                        log::warn!("Failed to send reminder notification: {}", e);
                    }
                    state
                        .notified_meetings
                        .lock()
                        .unwrap_or_else(|e| e.into_inner())
                        .insert(event.id.clone());
                }
            }

            // Open if within minutes_before and not already started more than 2 minutes ago,
            // or if we've been holding it back until the user's current call ends.
            let waiting = state
                .waiting_meetings
                .lock()
                .unwrap_or_else(|e| e.into_inner())
                .contains(&event.id);
            let in_open_window = seconds_until <= (minutes_before * 60) && minutes_until >= -2;
            if !waiting && !in_open_window {
                continue;
            }

            let already_opened = state
                .opened_meetings
                .lock()
                .unwrap_or_else(|e| e.into_inner())
                .contains(&event.id);
            if already_opened {
                continue;
            }

            let Some(url) = extract_meeting_url(event) else {
                continue;
            };

            let action = if waiting {
                let ended = parse_event_time(&event.end.date_time).is_none_or(|end| end <= now);
                if !mic::is_on_call() {
                    OpenAction::Open
                } else if ended {
                    OpenAction::GiveUp
                } else {
                    OpenAction::Wait
                }
            } else {
                decide_open_action(
                    mic::is_on_call(),
                    other_meeting_in_progress(&events, event, now),
                    wait_while_in_meeting,
                )
            };

            match action {
                OpenAction::Open => {}
                OpenAction::Wait => {
                    let newly_waiting = state
                        .waiting_meetings
                        .lock()
                        .unwrap_or_else(|e| e.into_inner())
                        .insert(event.id.clone());
                    if newly_waiting {
                        log::info!("On a call; holding back until it ends: {}", event.summary);
                        if let Err(e) = send_waiting_notification(&app, &event.summary) {
                            log::warn!("Failed to send waiting notification: {}", e);
                        }
                    }
                    continue;
                }
                OpenAction::AlreadyJoined | OpenAction::GiveUp => {
                    log::info!("Not opening ({:?}): {}", action, event.summary);
                    if action == OpenAction::AlreadyJoined {
                        if let Err(e) = send_already_joined_notification(&app, &event.summary) {
                            log::warn!("Failed to send notification: {}", e);
                        }
                    }
                    state
                        .waiting_meetings
                        .lock()
                        .unwrap_or_else(|e| e.into_inner())
                        .remove(&event.id);
                    state
                        .opened_meetings
                        .lock()
                        .unwrap_or_else(|e| e.into_inner())
                        .insert(event.id.clone());
                    continue;
                }
            }

            log::info!(
                "Opening meeting: {} ({})",
                event.summary,
                url
            );

            // Send "opening now" notification only if we haven't already
            // sent a reminder for this meeting.
            let already_notified = state
                .notified_meetings
                .lock()
                .unwrap_or_else(|e| e.into_inner())
                .contains(&event.id);
            if !already_notified {
                if let Err(e) = send_notification(&app, &event.summary) {
                    log::warn!("Failed to send notification: {}", e);
                }
                state
                    .notified_meetings
                    .lock()
                    .unwrap_or_else(|e| e.into_inner())
                    .insert(event.id.clone());
            }

            // Brief delay before opening
            tokio::time::sleep(Duration::from_secs(3)).await;

            // Determine which app to open with based on service type
            let open_with_app = detect_meeting_service(&url)
                .and_then(|service| {
                    app.store("settings.json")
                        .ok()
                        .and_then(|store| store.get("openWith"))
                        .and_then(|v| v.as_object().cloned())
                        .and_then(|obj| obj.get(service).cloned())
                        .and_then(|v| v.as_str().map(|s| s.to_string()))
                        .filter(|s| s != "default")
                });

            match open_with_app {
                Some(app_path) => {
                    log::info!("Opening with: {}", app_path);
                    if let Err(e) = open::with(&url, &app_path) {
                        log::warn!("Failed to open with {}: {}, falling back to default", app_path, e);
                        if let Err(e) = open::that(&url) {
                            log::error!("Failed to open URL with default handler: {}", e);
                        }
                    }
                }
                None => {
                    if let Err(e) = open::that(&url) {
                        log::error!("Failed to open URL: {}", e);
                    }
                }
            }

            state
                .waiting_meetings
                .lock()
                .unwrap_or_else(|e| e.into_inner())
                .remove(&event.id);
            state
                .opened_meetings
                .lock()
                .unwrap_or_else(|e| e.into_inner())
                .insert(event.id.clone());
        }

        // Clean up old entries from opened_meetings (events no longer in today's list)
        let events_ref = calendar_state
            .events
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        let event_ids: HashSet<String> = events_ref.iter().map(|e| e.id.clone()).collect();
        state
            .opened_meetings
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .retain(|id| event_ids.contains(id));
        state
            .notified_meetings
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .retain(|id| event_ids.contains(id));
        state
            .waiting_meetings
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .retain(|id| event_ids.contains(id));

        // Update tray title with countdown to next event
        update_tray_title(&app, &events);
    }
}

#[derive(Debug, PartialEq)]
enum OpenAction {
    Open,
    /// On another meeting's call: open once the mic is released.
    Wait,
    /// On a call with no other meeting in progress: the user most likely
    /// joined this one early, so opening it again would duplicate it.
    AlreadyJoined,
    /// Held back until the meeting itself ended.
    GiveUp,
}

fn decide_open_action(on_call: bool, other_in_progress: bool, wait_while_in_meeting: bool) -> OpenAction {
    match (on_call, other_in_progress) {
        (false, _) => OpenAction::Open,
        (true, true) if wait_while_in_meeting => OpenAction::Wait,
        (true, true) => OpenAction::Open,
        (true, false) => OpenAction::AlreadyJoined,
    }
}

/// Whether some other online meeting is in progress per the calendar.
/// Blocks without a meeting URL (focus time, in-person) don't count: being on
/// a call during one of those means the user joined `event` early.
fn other_meeting_in_progress(
    events: &[crate::calendar::CalendarEvent],
    event: &crate::calendar::CalendarEvent,
    now: DateTime<Utc>,
) -> bool {
    events.iter().any(|e| {
        e.id != event.id
            && !e.is_all_day
            && extract_meeting_url(e).is_some()
            && matches!(
                (parse_event_time(&e.start.date_time), parse_event_time(&e.end.date_time)),
                (Some(start), Some(end)) if start <= now && now < end
            )
    })
}

fn update_tray_title(app: &tauri::AppHandle, events: &[crate::calendar::CalendarEvent]) {
    let tray_countdown_minutes = app
        .store("settings.json")
        .ok()
        .and_then(|store| store.get("trayCountdownMinutes"))
        .and_then(|v| v.as_i64())
        .unwrap_or(DEFAULT_TRAY_COUNTDOWN_MINUTES);

    let lines = tray_lines(events, Utc::now(), tray_countdown_minutes, is_japanese_locale());
    log::debug!("Setting tray lines to: {:?}", lines);
    crate::tray::set_tray_lines(app, &lines);
}

/// Minutes from `from` to `to`, rounded up.
fn ceil_minutes(from: DateTime<Utc>, to: DateTime<Utc>) -> i64 {
    ((to - from).num_seconds() + 59) / 60
}

/// The meeting in progress right now; if several overlap, the one ending first.
fn current_meeting(
    events: &[crate::calendar::CalendarEvent],
    now: DateTime<Utc>,
) -> Option<(&crate::calendar::CalendarEvent, DateTime<Utc>)> {
    events
        .iter()
        .filter(|e| !e.is_all_day)
        .filter_map(|e| {
            let start = parse_event_time(&e.start.date_time)?;
            let end = parse_event_time(&e.end.date_time)?;
            (start <= now && now < end).then_some((e, end))
        })
        .min_by_key(|(_, end)| *end)
}

/// Lines to show next to the tray icon:
/// - in a meeting: time left, plus the countdown to the next one when it is
///   within the threshold and doesn't start right as this one ends
/// - otherwise: the countdown to the next meeting, as before
fn tray_lines(
    events: &[crate::calendar::CalendarEvent],
    now: DateTime<Utc>,
    tray_countdown_minutes: i64,
    is_ja: bool,
) -> Vec<String> {
    let next = events
        .iter()
        .filter(|e| !e.is_all_day)
        .filter_map(|e| parse_event_time(&e.start.date_time))
        .filter(|start| *start > now)
        .min()
        .filter(|start| {
            // 0 = always show, otherwise show only within threshold
            tray_countdown_minutes == 0 || ceil_minutes(now, *start) <= tray_countdown_minutes
        });

    let next_line = |start: DateTime<Utc>| format_tray_duration(ceil_minutes(now, start), is_ja);

    match current_meeting(events, now) {
        Some((_, end)) => {
            let left = format_tray_duration(ceil_minutes(now, end), is_ja);
            let mut lines = vec![if is_ja { format!("残{}", left) } else { format!("{} left", left) }];
            if let Some(start) = next.filter(|start| *start != end) {
                let until = next_line(start);
                lines.push(if is_ja { format!("次{}", until) } else { format!("next {}", until) });
            }
            lines
        }
        None => next.map(next_line).filter(|s| !s.is_empty()).into_iter().collect(),
    }
}

fn format_tray_duration(mins: i64, is_ja: bool) -> String {
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

fn send_notification(app: &tauri::AppHandle, summary: &str) -> Result<(), Box<dyn std::error::Error>> {
    use tauri_plugin_notification::NotificationExt;
    let is_ja = is_japanese_locale();
    let body = if is_ja {
        format!("開始: {}", summary)
    } else {
        format!("Opening: {}", summary)
    };
    app.notification().builder().title("Galopen").body(body).show()?;
    Ok(())
}

fn send_reminder_notification(
    app: &tauri::AppHandle,
    summary: &str,
    mins_until: i64,
) -> Result<(), Box<dyn std::error::Error>> {
    use tauri_plugin_notification::NotificationExt;
    let is_ja = is_japanese_locale();
    let body = if is_ja {
        if mins_until <= 0 {
            format!("まもなく開始: {}", summary)
        } else {
            format!("{}分後に開始: {}", mins_until, summary)
        }
    } else if mins_until <= 0 {
        format!("Starting now: {}", summary)
    } else {
        format!("Starts in {} min: {}", mins_until, summary)
    };
    app.notification().builder().title("Galopen").body(body).show()?;
    Ok(())
}

fn send_waiting_notification(app: &tauri::AppHandle, summary: &str) -> Result<(), Box<dyn std::error::Error>> {
    use tauri_plugin_notification::NotificationExt;
    let body = if is_japanese_locale() {
        format!("参加中の会議が終わったら開きます: {}", summary)
    } else {
        format!("Will open when your current call ends: {}", summary)
    };
    app.notification().builder().title("Galopen").body(body).show()?;
    Ok(())
}

fn send_already_joined_notification(app: &tauri::AppHandle, summary: &str) -> Result<(), Box<dyn std::error::Error>> {
    use tauri_plugin_notification::NotificationExt;
    let body = if is_japanese_locale() {
        format!("通話中のため自動で開きませんでした: {}", summary)
    } else {
        format!("You're on a call, so this wasn't opened: {}", summary)
    };
    app.notification().builder().title("Galopen").body(body).show()?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::calendar::{CalendarEvent, EventDateTime};
    use chrono::TimeZone;

    fn at(h: u32, m: u32) -> DateTime<Utc> {
        Utc.with_ymd_and_hms(2026, 9, 30, h, m, 0).unwrap()
    }

    fn event(id: &str, start: DateTime<Utc>, end: DateTime<Utc>, url: Option<&str>) -> CalendarEvent {
        CalendarEvent {
            id: id.to_string(),
            summary: id.to_string(),
            start: EventDateTime { date_time: Some(start.to_rfc3339()), date: None },
            end: EventDateTime { date_time: Some(end.to_rfc3339()), date: None },
            description: None,
            location: None,
            url: url.map(String::from),
            is_all_day: false,
            status: None,
            calendar_id: None,
            calendar_name: None,
            calendar_account_name: None,
            external_url: None,
        }
    }

    const MEET: Option<&str> = Some("https://meet.google.com/abc-defg-hij");

    #[test]
    fn countdown_only_when_not_in_a_meeting() {
        let events = [event("a", at(15, 0), at(16, 0), MEET)];
        assert_eq!(tray_lines(&events, at(14, 35), 30, true), vec!["25分"]);
        assert!(tray_lines(&events, at(14, 0), 30, true).is_empty());
    }

    #[test]
    fn time_left_alone_when_next_is_out_of_range() {
        let events = [
            event("a", at(14, 0), at(15, 0), MEET),
            event("b", at(16, 0), at(17, 0), MEET),
        ];
        assert_eq!(tray_lines(&events, at(14, 48), 30, true), vec!["残12分"]);
    }

    #[test]
    fn two_lines_when_next_is_in_range_with_a_gap() {
        let events = [
            event("a", at(14, 0), at(15, 0), MEET),
            event("b", at(15, 30), at(16, 0), MEET),
        ];
        assert_eq!(tray_lines(&events, at(14, 48), 60, true), vec!["残12分", "次42分"]);
        assert_eq!(tray_lines(&events, at(14, 48), 60, false), vec!["12m left", "next 42m"]);
    }

    #[test]
    fn back_to_back_collapses_to_one_line() {
        let events = [
            event("a", at(14, 0), at(15, 0), MEET),
            event("b", at(15, 0), at(16, 0), MEET),
        ];
        assert_eq!(tray_lines(&events, at(14, 48), 30, true), vec!["残12分"]);
    }

    #[test]
    fn time_left_ignores_threshold_and_url() {
        let events = [event("a", at(14, 0), at(16, 0), None)];
        assert_eq!(tray_lines(&events, at(14, 0), 15, true), vec!["残2時間"]);
    }

    #[test]
    fn overlapping_meetings_show_the_one_ending_first() {
        let events = [
            event("long", at(14, 0), at(16, 0), MEET),
            event("short", at(14, 30), at(15, 0), MEET),
        ];
        assert_eq!(tray_lines(&events, at(14, 40), 30, true), vec!["残20分"]);
    }

    #[test]
    fn open_action_follows_call_and_calendar() {
        assert_eq!(decide_open_action(false, true, true), OpenAction::Open);
        assert_eq!(decide_open_action(true, true, true), OpenAction::Wait);
        assert_eq!(decide_open_action(true, true, false), OpenAction::Open);
        assert_eq!(decide_open_action(true, false, true), OpenAction::AlreadyJoined);
        assert_eq!(decide_open_action(true, false, false), OpenAction::AlreadyJoined);
    }

    #[test]
    fn only_online_meetings_count_as_in_progress() {
        let next = event("next", at(15, 0), at(16, 0), MEET);
        let focus = event("focus", at(14, 0), at(15, 0), None);
        let call = event("call", at(14, 0), at(15, 0), MEET);
        assert!(!other_meeting_in_progress(&[focus, next.clone()], &next, at(14, 59)));
        assert!(other_meeting_in_progress(&[call, next.clone()], &next, at(14, 59)));
    }
}
