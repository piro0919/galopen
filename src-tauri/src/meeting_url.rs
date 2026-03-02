use crate::calendar::CalendarEvent;
use regex::Regex;

pub fn extract_meeting_url(event: &CalendarEvent) -> Option<String> {
    let url = extract_raw_meeting_url(event)?;

    // For Google Meet URLs, append ?authuser=<email> if the calendar account looks like an email
    if url.contains("meet.google.com") {
        if let Some(ref account) = event.calendar_account_name {
            if account.contains('@') && !url.contains("authuser") {
                let separator = if url.contains('?') { "&" } else { "?" };
                return Some(format!("{}{}authuser={}", url, separator, account));
            }
        }
    }

    Some(url)
}

fn extract_raw_meeting_url(event: &CalendarEvent) -> Option<String> {
    // Priority 1: event URL property
    if let Some(ref url) = event.url {
        if is_meeting_url(url) {
            return Some(url.clone());
        }
    }

    // Priority 2: location field
    if let Some(ref location) = event.location {
        if let Some(url) = find_meeting_url(location) {
            return Some(url);
        }
    }

    // Priority 3: description/notes field
    if let Some(ref desc) = event.description {
        if let Some(url) = find_meeting_url(desc) {
            return Some(url);
        }
    }

    None
}

/// Returns a service key for the given URL, or None if not a recognized meeting service.
pub fn detect_meeting_service(url: &str) -> Option<&'static str> {
    if url.contains("meet.google.com") {
        Some("googleMeet")
    } else if url.contains("zoom.us") {
        Some("zoom")
    } else if url.contains("teams.microsoft.com") {
        Some("teams")
    } else if url.contains("webex.com") {
        Some("webex")
    } else {
        None
    }
}

fn is_meeting_url(url: &str) -> bool {
    url.contains("zoom.us")
        || url.contains("meet.google.com")
        || url.contains("teams.microsoft.com")
        || url.contains("webex.com")
}

fn find_meeting_url(text: &str) -> Option<String> {
    let patterns = [
        r"https?://[\w-]*\.?zoom\.us/j/\S+",
        r"https?://meet\.google\.com/[\w-]+",
        r"https?://teams\.microsoft\.com/l/meetup-join/\S+",
        r"https?://[\w-]+\.webex\.com/\S+",
    ];

    for pattern in &patterns {
        if let Ok(re) = Regex::new(pattern) {
            if let Some(m) = re.find(text) {
                return Some(m.as_str().to_string());
            }
        }
    }

    None
}
