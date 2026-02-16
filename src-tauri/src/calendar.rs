use chrono::{DateTime, Local, NaiveDate, TimeZone, Utc};
use objc2::rc::Retained;
use objc2_event_kit::{
    EKAuthorizationStatus, EKCalendar, EKEntityType, EKEvent, EKEventStatus, EKEventStore,
};
use objc2_foundation::{NSArray, NSDate, NSString, NSURL};
use serde::{Deserialize, Serialize};
use std::sync::mpsc;
use std::sync::Mutex;

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CalendarEvent {
    pub id: String,
    #[serde(default)]
    pub summary: String,
    pub start: EventDateTime,
    pub end: EventDateTime,
    pub description: Option<String>,
    pub location: Option<String>,
    pub url: Option<String>,
    pub is_all_day: bool,
    pub status: Option<String>,
    pub calendar_id: Option<String>,
    pub calendar_name: Option<String>,
    pub external_url: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct EventDateTime {
    pub date_time: Option<String>,
    pub date: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CalendarInfo {
    pub id: String,
    pub title: String,
    pub source_name: String,
}

// Commands sent to the dedicated EventKit thread
enum CalendarCommand {
    FetchToday(mpsc::Sender<Result<Vec<CalendarEvent>, String>>),
    FetchCalendars(mpsc::Sender<Result<Vec<CalendarInfo>, String>>),
    CheckPermission(mpsc::Sender<Result<String, String>>),
    RequestPermission(mpsc::Sender<Result<bool, String>>),
}

pub struct CalendarState {
    pub events: Mutex<Vec<CalendarEvent>>,
    last_sync_date: Mutex<Option<NaiveDate>>,
    command_tx: mpsc::Sender<CalendarCommand>,
}

impl CalendarState {
    pub fn new() -> Self {
        let (tx, rx) = mpsc::channel::<CalendarCommand>();

        // Spawn a dedicated thread that owns the EKEventStore.
        // EKEventStore is not Send/Sync, so all EventKit calls happen here.
        // All EventKit calls are wrapped in both catch_unwind (Rust panics)
        // and exception::catch (ObjC exceptions) to prevent crashes.
        std::thread::spawn(move || {
            let store = unsafe { EKEventStore::new() };
            for cmd in rx {
                match cmd {
                    CalendarCommand::FetchToday(reply) => {
                        let result =
                            std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| unsafe {
                                objc2::exception::catch(std::panic::AssertUnwindSafe(|| {
                                    fetch_todays_events_inner(&store)
                                }))
                            }));
                        let _ = reply.send(match result {
                            Ok(Ok(v)) => v,
                            Ok(Err(e)) => Err(format!("ObjC exception: {:?}", e)),
                            Err(_) => Err("EventKit panic".to_string()),
                        });
                    }
                    CalendarCommand::FetchCalendars(reply) => {
                        let result =
                            std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| unsafe {
                                objc2::exception::catch(std::panic::AssertUnwindSafe(|| {
                                    fetch_calendars_inner(&store)
                                }))
                            }));
                        let _ = reply.send(match result {
                            Ok(Ok(v)) => v,
                            Ok(Err(e)) => Err(format!("ObjC exception: {:?}", e)),
                            Err(_) => Err("EventKit panic".to_string()),
                        });
                    }
                    CalendarCommand::CheckPermission(reply) => {
                        let result =
                            std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| unsafe {
                                objc2::exception::catch(std::panic::AssertUnwindSafe(|| {
                                    check_permission_inner()
                                }))
                            }));
                        let _ = reply.send(match result {
                            Ok(Ok(v)) => v,
                            Ok(Err(e)) => Err(format!("ObjC exception: {:?}", e)),
                            Err(_) => Err("EventKit panic".to_string()),
                        });
                    }
                    CalendarCommand::RequestPermission(reply) => {
                        let result =
                            std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| unsafe {
                                objc2::exception::catch(std::panic::AssertUnwindSafe(|| {
                                    request_permission_inner(&store)
                                }))
                            }));
                        let _ = reply.send(match result {
                            Ok(Ok(v)) => v,
                            Ok(Err(e)) => Err(format!("ObjC exception: {:?}", e)),
                            Err(_) => Err("EventKit panic".to_string()),
                        });
                    }
                }
            }
        });

        Self {
            events: Mutex::new(Vec::new()),
            last_sync_date: Mutex::new(None),
            command_tx: tx,
        }
    }
}

fn nsdate_to_chrono(nsdate: &NSDate) -> DateTime<Utc> {
    let timestamp = nsdate.timeIntervalSince1970();
    DateTime::from_timestamp(timestamp as i64, 0).unwrap_or_default()
}

fn ekevent_to_calendar_event(event: &EKEvent) -> Option<CalendarEvent> {
    // Use msg_send! with Option types for properties that may return nil
    // to avoid panics from objc2's non-null Retained assertions.
    let title: Option<Retained<NSString>> = unsafe { objc2::msg_send![event, title] };
    let title = title.map(|s| s.to_string()).unwrap_or_default();
    let start_date: Option<Retained<NSDate>> = unsafe { objc2::msg_send![event, startDate] };
    let end_date: Option<Retained<NSDate>> = unsafe { objc2::msg_send![event, endDate] };
    let start_date = start_date?;
    let end_date = end_date?;
    let is_all_day = unsafe { event.isAllDay() };
    let event_id = unsafe { event.eventIdentifier() }
        .map(|s| s.to_string())
        .unwrap_or_default();

    let location = unsafe { event.location() }.map(|s| s.to_string());
    let notes = unsafe { event.notes() }.map(|s| s.to_string());
    let url = unsafe { event.URL() }
        .and_then(|u| u.absoluteString().map(|s| s.to_string()));

    let start_chrono = nsdate_to_chrono(&start_date);
    let end_chrono = nsdate_to_chrono(&end_date);

    let status_raw = unsafe { event.status() };
    let status = if status_raw == EKEventStatus::Confirmed {
        Some("confirmed".to_string())
    } else if status_raw == EKEventStatus::Tentative {
        Some("tentative".to_string())
    } else if status_raw == EKEventStatus::Canceled {
        Some("cancelled".to_string())
    } else {
        None
    };

    let cal: Option<Retained<EKCalendar>> = unsafe { objc2::msg_send![event, calendar] };
    let calendar_id = cal
        .as_ref()
        .map(|c| unsafe { c.calendarIdentifier() }.to_string());
    let calendar_name = cal.as_ref().and_then(|c| {
        let t: Option<Retained<NSString>> = unsafe { objc2::msg_send![c, title] };
        t.map(|s| s.to_string())
    });

    // calendarItemExternalURI - use objc2 exception handling to avoid crash
    let external_url: Option<String> = unsafe {
        objc2::exception::catch(std::panic::AssertUnwindSafe(|| {
            let uri: Option<Retained<NSURL>> = objc2::msg_send![event, calendarItemExternalURI];
            uri.and_then(|u| u.absoluteString().map(|s| s.to_string()))
        }))
        .unwrap_or(None)
    };

    Some(CalendarEvent {
        id: event_id,
        summary: title,
        start: EventDateTime {
            date_time: if !is_all_day {
                Some(start_chrono.to_rfc3339())
            } else {
                None
            },
            date: if is_all_day {
                Some(start_chrono.format("%Y-%m-%d").to_string())
            } else {
                None
            },
        },
        end: EventDateTime {
            date_time: if !is_all_day {
                Some(end_chrono.to_rfc3339())
            } else {
                None
            },
            date: if is_all_day {
                Some(end_chrono.format("%Y-%m-%d").to_string())
            } else {
                None
            },
        },
        description: notes,
        location,
        url,
        is_all_day,
        status,
        calendar_id,
        calendar_name,
        external_url,
    })
}

#[allow(deprecated)]
fn check_permission_inner() -> Result<String, String> {
    let status =
        unsafe { EKEventStore::authorizationStatusForEntityType(EKEntityType::Event) };
    let s = if status == EKAuthorizationStatus::FullAccess
        || status == EKAuthorizationStatus::Authorized
    {
        "granted"
    } else if status == EKAuthorizationStatus::Denied {
        "denied"
    } else if status == EKAuthorizationStatus::Restricted {
        "restricted"
    } else {
        "not_determined"
    };
    Ok(s.to_string())
}

fn request_permission_inner(store: &EKEventStore) -> Result<bool, String> {
    let (tx, rx) = mpsc::channel();
    let tx_arc = std::sync::Arc::new(std::sync::Mutex::new(Some(tx)));
    let tx_clone = tx_arc.clone();

    let completion = block2::RcBlock::new(
        move |granted: objc2::runtime::Bool, _error: *mut objc2_foundation::NSError| {
            if let Some(sender) = tx_clone.lock().unwrap().take() {
                let _ = sender.send(granted.as_bool());
            }
        },
    );

    unsafe {
        let _: () =
            objc2::msg_send![store, requestFullAccessToEventsWithCompletion: &*completion];
    }

    rx.recv()
        .map_err(|e| format!("Permission request failed: {}", e))
}

fn fetch_calendars_inner(store: &EKEventStore) -> Result<Vec<CalendarInfo>, String> {
    let calendars =
        unsafe { store.calendarsForEntityType(EKEntityType::Event) };

    let mut result: Vec<CalendarInfo> = calendars
        .iter()
        .map(|cal| {
            let id = unsafe { cal.calendarIdentifier() }.to_string();
            let title = unsafe { cal.title() }.to_string();
            let source_name = unsafe { cal.source() }
                .map(|s| unsafe { s.title() }.to_string())
                .unwrap_or_default();
            CalendarInfo {
                id,
                title,
                source_name,
            }
        })
        .collect();

    result.sort_by(|a, b| a.source_name.cmp(&b.source_name).then(a.title.cmp(&b.title)));
    Ok(result)
}

fn fetch_todays_events_inner(
    store: &EKEventStore,
) -> Result<Vec<CalendarEvent>, String> {
    let today = Local::now().date_naive();
    let tomorrow = today + chrono::Duration::days(1);
    let start_of_day = today
        .and_hms_opt(0, 0, 0)
        .ok_or("Failed to create start of day")?;
    let end_of_tomorrow = tomorrow
        .and_hms_opt(23, 59, 59)
        .ok_or("Failed to create end of tomorrow")?;

    let start_utc = Local
        .from_local_datetime(&start_of_day)
        .single()
        .ok_or("Failed to convert start to UTC")?
        .with_timezone(&Utc);
    let end_utc = Local
        .from_local_datetime(&end_of_tomorrow)
        .single()
        .ok_or("Failed to convert end to UTC")?
        .with_timezone(&Utc);

    let start_nsdate = NSDate::dateWithTimeIntervalSince1970(start_utc.timestamp() as f64);
    let end_nsdate = NSDate::dateWithTimeIntervalSince1970(end_utc.timestamp() as f64);

    // Ask macOS to pull latest data from remote sources (Google, iCloud, etc.)
    unsafe { store.refreshSourcesIfNecessary() };
    // Reset cached data so external changes are picked up
    unsafe { store.reset() };

    let predicate = unsafe {
        store.predicateForEventsWithStartDate_endDate_calendars(
            &start_nsdate,
            &end_nsdate,
            None::<&NSArray<EKCalendar>>,
        )
    };

    let ek_events = unsafe { store.eventsMatchingPredicate(&predicate) };

    let mut events: Vec<CalendarEvent> = ek_events
        .iter()
        .filter_map(|e| ekevent_to_calendar_event(&e))
        .filter(|e| e.status.as_deref() != Some("cancelled"))
        .collect();

    events.sort_by(|a, b| {
        let a_time = a
            .start
            .date_time
            .as_deref()
            .or(a.start.date.as_deref())
            .unwrap_or("");
        let b_time = b
            .start
            .date_time
            .as_deref()
            .or(b.start.date.as_deref())
            .unwrap_or("");
        a_time.cmp(b_time)
    });

    Ok(events)
}

pub fn sync_events(calendar_state: &CalendarState) -> Result<(), String> {
    let (tx, rx) = mpsc::channel();
    calendar_state
        .command_tx
        .send(CalendarCommand::FetchToday(tx))
        .map_err(|e| e.to_string())?;
    let events = rx.recv().map_err(|e| e.to_string())??;
    *calendar_state.events.lock().unwrap() = events;
    *calendar_state.last_sync_date.lock().unwrap() = Some(Local::now().date_naive());
    Ok(())
}

pub fn has_permission(calendar_state: &CalendarState) -> bool {
    let (tx, rx) = mpsc::channel();
    if calendar_state
        .command_tx
        .send(CalendarCommand::CheckPermission(tx))
        .is_err()
    {
        return false;
    }
    rx.recv()
        .ok()
        .and_then(|r| r.ok())
        .map(|s| s == "granted")
        .unwrap_or(false)
}

#[tauri::command]
pub async fn check_calendar_permission(
    calendar_state: tauri::State<'_, CalendarState>,
) -> Result<String, String> {
    let (tx, rx) = mpsc::channel();
    calendar_state
        .command_tx
        .send(CalendarCommand::CheckPermission(tx))
        .map_err(|e| e.to_string())?;
    rx.recv().map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn request_calendar_permission(
    calendar_state: tauri::State<'_, CalendarState>,
) -> Result<bool, String> {
    let (tx, rx) = mpsc::channel();
    calendar_state
        .command_tx
        .send(CalendarCommand::RequestPermission(tx))
        .map_err(|e| e.to_string())?;
    rx.recv().map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn get_calendars(
    calendar_state: tauri::State<'_, CalendarState>,
) -> Result<Vec<CalendarInfo>, String> {
    let (tx, rx) = mpsc::channel();
    calendar_state
        .command_tx
        .send(CalendarCommand::FetchCalendars(tx))
        .map_err(|e| e.to_string())?;
    rx.recv().map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn get_todays_events(
    calendar_state: tauri::State<'_, CalendarState>,
) -> Result<Vec<CalendarEvent>, String> {
    Ok(calendar_state.events.lock().unwrap().clone())
}

#[tauri::command]
pub async fn force_sync(
    calendar_state: tauri::State<'_, CalendarState>,
) -> Result<Vec<CalendarEvent>, String> {
    sync_events(&calendar_state)?;
    Ok(calendar_state.events.lock().unwrap().clone())
}
