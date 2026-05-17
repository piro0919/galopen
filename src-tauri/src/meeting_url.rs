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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::calendar::{CalendarEvent, EventDateTime};

    fn make_event(
        url: Option<&str>,
        location: Option<&str>,
        description: Option<&str>,
    ) -> CalendarEvent {
        CalendarEvent {
            id: "test".to_string(),
            summary: "Test".to_string(),
            start: EventDateTime { date_time: None, date: None },
            end: EventDateTime { date_time: None, date: None },
            description: description.map(String::from),
            location: location.map(String::from),
            url: url.map(String::from),
            is_all_day: false,
            status: None,
            calendar_id: None,
            calendar_name: None,
            calendar_account_name: None,
            external_url: None,
        }
    }

    #[test]
    fn detects_known_services() {
        assert_eq!(detect_meeting_service("https://meet.google.com/abc-defg-hij"), Some("googleMeet"));
        assert_eq!(detect_meeting_service("https://us02web.zoom.us/j/123456789"), Some("zoom"));
        assert_eq!(detect_meeting_service("https://teams.microsoft.com/l/meetup-join/xyz"), Some("teams"));
        assert_eq!(detect_meeting_service("https://company.webex.com/meet/foo"), Some("webex"));
        assert_eq!(detect_meeting_service("https://example.com/not-a-meeting"), None);
    }

    #[test]
    fn url_field_takes_priority_over_location_and_description() {
        let event = make_event(
            Some("https://meet.google.com/aaa-bbbb-ccc"),
            Some("https://us02web.zoom.us/j/111"),
            Some("Join: https://teams.microsoft.com/l/meetup-join/xyz"),
        );
        let url = extract_meeting_url(&event).unwrap();
        assert!(url.starts_with("https://meet.google.com/aaa-bbbb-ccc"));
    }

    #[test]
    fn location_takes_priority_over_description() {
        let event = make_event(
            None,
            Some("https://us02web.zoom.us/j/111"),
            Some("Backup: https://teams.microsoft.com/l/meetup-join/xyz"),
        );
        assert_eq!(extract_meeting_url(&event).as_deref(), Some("https://us02web.zoom.us/j/111"));
    }

    #[test]
    fn description_used_when_url_and_location_have_no_meeting_url() {
        let event = make_event(
            Some("https://example.com/agenda.pdf"),
            Some("Conference Room A"),
            Some("Join here: https://teams.microsoft.com/l/meetup-join/abc?tenantId=xyz"),
        );
        let url = extract_meeting_url(&event).unwrap();
        assert!(url.contains("teams.microsoft.com/l/meetup-join/abc"));
    }

    #[test]
    fn extracts_meeting_url_from_freeform_description() {
        let event = make_event(
            None,
            None,
            Some("Hi team, please join at https://us02web.zoom.us/j/9876543210?pwd=abc see you there"),
        );
        let url = extract_meeting_url(&event).unwrap();
        assert!(url.starts_with("https://us02web.zoom.us/j/9876543210"));
    }

    #[test]
    fn returns_none_when_no_meeting_url_present() {
        let event = make_event(
            Some("https://example.com/agenda.pdf"),
            Some("Conference Room A"),
            Some("No link this time"),
        );
        assert!(extract_meeting_url(&event).is_none());
    }

    #[test]
    fn google_meet_appends_authuser_for_email_account() {
        let mut event = make_event(Some("https://meet.google.com/abc-defg-hij"), None, None);
        event.calendar_account_name = Some("user@example.com".to_string());
        assert_eq!(
            extract_meeting_url(&event).as_deref(),
            Some("https://meet.google.com/abc-defg-hij?authuser=user@example.com")
        );
    }

    #[test]
    fn google_meet_does_not_duplicate_authuser() {
        let mut event = make_event(
            Some("https://meet.google.com/abc-defg-hij?authuser=user@example.com"),
            None,
            None,
        );
        event.calendar_account_name = Some("user@example.com".to_string());
        assert_eq!(
            extract_meeting_url(&event).as_deref(),
            Some("https://meet.google.com/abc-defg-hij?authuser=user@example.com")
        );
    }

    #[test]
    fn google_meet_skips_authuser_for_non_email_account() {
        let mut event = make_event(Some("https://meet.google.com/abc-defg-hij"), None, None);
        event.calendar_account_name = Some("iCloud".to_string());
        assert_eq!(
            extract_meeting_url(&event).as_deref(),
            Some("https://meet.google.com/abc-defg-hij")
        );
    }
}
