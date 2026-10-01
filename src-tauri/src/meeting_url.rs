use crate::calendar::CalendarEvent;
use regex::Regex;
use std::sync::LazyLock;
use url::Url;

/// Meeting services we auto-open, in the order the text search tries them.
///
/// Calendar invites can be sent by anyone, so a URL only counts when it is
/// `https` and its host is the service's domain itself or a real subdomain of
/// it. Substring checks would accept `zoom.us.evil.example` or `evilzoom.us`.
#[derive(Clone, Copy, Debug, PartialEq)]
enum Service {
    Zoom,
    GoogleMeet,
    Teams,
    Webex,
}

const SEARCH_ORDER: [Service; 4] = [Service::Zoom, Service::GoogleMeet, Service::Teams, Service::Webex];

impl Service {
    fn key(self) -> &'static str {
        match self {
            Service::GoogleMeet => "googleMeet",
            Service::Zoom => "zoom",
            Service::Teams => "teams",
            Service::Webex => "webex",
        }
    }

    fn matches_host(self, host: &str) -> bool {
        match self {
            Service::Zoom => host_is_or_under(host, "zoom.us"),
            Service::GoogleMeet => host == "meet.google.com",
            Service::Teams => host == "teams.microsoft.com",
            Service::Webex => host_is_or_under(host, "webex.com"),
        }
    }

    /// Whether a link found in free text points at an actual meeting rather
    /// than, say, the service's home page. Mirrors the paths the old patterns
    /// required.
    fn matches_meeting_path(self, path: &str) -> bool {
        match self {
            Service::Zoom => path.starts_with("/j/") && path.len() > 3,
            Service::GoogleMeet => meet_code(path).is_some(),
            Service::Teams => {
                path.starts_with("/l/meetup-join/") && path.len() > "/l/meetup-join/".len()
            }
            Service::Webex => path.len() > 1,
        }
    }
}

fn host_is_or_under(host: &str, domain: &str) -> bool {
    host == domain
        || host
            .strip_suffix(domain)
            .is_some_and(|prefix| prefix.ends_with('.') && prefix.len() > 1)
}

/// The meeting code of a Meet path (`/abc-defg-hij`), if it has one.
fn meet_code(path: &str) -> Option<&str> {
    let rest = path.strip_prefix('/')?;
    let end = rest
        .find(|c: char| !(c.is_alphanumeric() || c == '_' || c == '-'))
        .unwrap_or(rest.len());
    (end > 0).then(|| &rest[..end])
}

/// Parses `raw` and returns the service it belongs to, with the parsed URL.
fn classify(raw: &str) -> Option<(Service, Url)> {
    let url = Url::parse(raw).ok()?;
    if url.scheme() != "https" {
        return None;
    }
    // `Url` lowercases the host and strips any `user:pass@`, so this is the
    // host the browser will actually connect to.
    let host = url.host_str()?;
    let service = SEARCH_ORDER.into_iter().find(|s| s.matches_host(host))?;
    Some((service, url))
}

pub fn extract_meeting_url(event: &CalendarEvent) -> Option<String> {
    let url = extract_raw_meeting_url(event)?;

    // For Google Meet URLs, append ?authuser=<email> if the calendar account looks like an email
    if detect_meeting_service(&url) == Some("googleMeet") {
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
        if let Some((_, parsed)) = classify(url.trim()) {
            // Return the parsed form so what we open is exactly what we checked.
            return Some(parsed.to_string());
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
    classify(url).map(|(service, _)| service.key())
}

/// Candidate links in free text. Angle brackets and quotes end a link so that
/// `<https://...>` and `href="https://..."` don't drag the delimiter along.
static LINK: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#"https?://[^\s<>"']+"#).expect("valid regex"));

fn find_meeting_url(text: &str) -> Option<String> {
    let links: Vec<(Service, Url)> = LINK
        .find_iter(text)
        .filter_map(|m| classify(m.as_str()))
        .filter(|(service, url)| service.matches_meeting_path(url.path()))
        .collect();

    // Earlier services win over later ones regardless of where they appear,
    // as with the per-service patterns this replaces.
    SEARCH_ORDER.into_iter().find_map(|wanted| {
        links.iter().find(|(s, _)| *s == wanted).map(|(service, url)| match service {
            // Meet links are reduced to the meeting code, dropping any query.
            Service::GoogleMeet => format!(
                "https://meet.google.com/{}",
                meet_code(url.path()).unwrap_or_default()
            ),
            _ => url.to_string(),
        })
    })
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
            declined: false,
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

    // --- Spoofed hosts: anyone can send an invite, and we auto-open the link ---

    /// Lookalike hosts for each service, all of which must be rejected.
    const SPOOFS: [&str; 20] = [
        // Zoom
        "https://zoom.us.evil.example/j/123",
        "https://evilzoom.us/j/123",
        "https://zoom-us.example/j/123",
        "https://evil.example/zoom.us/j/123",
        "https://zoom.us@evil.example/j/123",
        // Google Meet
        "https://meet.google.com.evil.example/abc-defg-hij",
        "https://evilmeet.google.com/abc-defg-hij",
        "https://meet.google.co/abc-defg-hij",
        "https://evil.example/meet.google.com/abc-defg-hij",
        "https://meet.google.com@evil.example/abc-defg-hij",
        // Teams
        "https://teams.microsoft.com.evil.example/l/meetup-join/xyz",
        "https://evilteams.microsoft.com/l/meetup-join/xyz",
        "https://teams.microsoft.co/l/meetup-join/xyz",
        "https://evil.example/teams.microsoft.com/l/meetup-join/xyz",
        "https://teams.microsoft.com@evil.example/l/meetup-join/xyz",
        // Webex
        "https://company.webex.com.evil.example/meet/foo",
        "https://evilwebex.com/meet/foo",
        "https://webex.co/meet/foo",
        "https://evil.example/company.webex.com/meet/foo",
        "https://company.webex.com@evil.example/meet/foo",
    ];

    #[test]
    fn spoofed_hosts_are_not_meeting_services() {
        for url in SPOOFS {
            assert_eq!(detect_meeting_service(url), None, "{url}");
        }
    }

    #[test]
    fn spoofed_hosts_in_the_url_field_are_not_opened() {
        for url in SPOOFS {
            let event = make_event(Some(url), None, None);
            assert_eq!(extract_meeting_url(&event), None, "{url}");
        }
    }

    #[test]
    fn spoofed_hosts_in_free_text_are_not_opened() {
        for url in SPOOFS {
            let text = format!("Join here: {url} thanks");
            assert_eq!(extract_meeting_url(&make_event(None, Some(&text), None)), None, "{url}");
            assert_eq!(extract_meeting_url(&make_event(None, None, Some(&text))), None, "{url}");
        }
    }

    #[test]
    fn a_spoof_does_not_shadow_a_real_link_later_in_the_text() {
        let event = make_event(
            None,
            None,
            Some("https://zoom.us.evil.example/j/1 or the real one https://us02web.zoom.us/j/2"),
        );
        assert_eq!(extract_meeting_url(&event).as_deref(), Some("https://us02web.zoom.us/j/2"));
    }

    #[test]
    fn plain_http_is_rejected_for_every_service() {
        for url in [
            "http://us02web.zoom.us/j/123",
            "http://meet.google.com/abc-defg-hij",
            "http://teams.microsoft.com/l/meetup-join/xyz",
            "http://company.webex.com/meet/foo",
        ] {
            assert_eq!(detect_meeting_service(url), None, "{url}");
            assert_eq!(extract_meeting_url(&make_event(Some(url), None, None)), None, "{url}");
            assert_eq!(extract_meeting_url(&make_event(None, Some(url), None)), None, "{url}");
        }
    }

    #[test]
    fn bare_domains_and_subdomains_are_accepted_where_the_service_uses_them() {
        assert_eq!(detect_meeting_service("https://zoom.us/j/123"), Some("zoom"));
        assert_eq!(detect_meeting_service("https://ZOOM.US/j/123"), Some("zoom"));
        assert_eq!(detect_meeting_service("https://webex.com/meet/foo"), Some("webex"));
        // Meet and Teams live on one exact host
        assert_eq!(detect_meeting_service("https://x.meet.google.com/abc"), None);
        assert_eq!(detect_meeting_service("https://x.teams.microsoft.com/l/meetup-join/a"), None);
    }

    #[test]
    fn links_in_free_text_still_need_a_meeting_path() {
        assert_eq!(extract_meeting_url(&make_event(None, Some("see https://zoom.us/pricing"), None)), None);
        assert_eq!(extract_meeting_url(&make_event(None, Some("see https://teams.microsoft.com/"), None)), None);
        assert_eq!(extract_meeting_url(&make_event(None, Some("see https://meet.google.com/"), None)), None);
    }

    #[test]
    fn meet_links_in_text_drop_the_query_and_trailing_bracket() {
        let event = make_event(None, None, Some("<https://meet.google.com/abc-defg-hij?hs=122>"));
        assert_eq!(extract_meeting_url(&event).as_deref(), Some("https://meet.google.com/abc-defg-hij"));
    }
}
