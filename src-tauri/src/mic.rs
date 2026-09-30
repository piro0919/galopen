//! Detects whether the user is on a call, by asking CoreAudio which apps
//! are capturing from the microphone.
//!
//! macOS 14.2+ exposes a per-process list, so we can require the capturing
//! app to be a meeting app or a browser. That keeps always-on mic users
//! (noise cancellation, dictation) from suppressing auto-open forever.
//! Older systems only tell us whether the default input device is running
//! at all, so there we fall back to that.

use std::ffi::{c_char, c_void, CStr};

type AudioObjectId = u32;
type OsStatus = i32;

#[repr(C)]
struct PropertyAddress {
    selector: u32,
    scope: u32,
    element: u32,
}

const fn fourcc(s: &[u8; 4]) -> u32 {
    ((s[0] as u32) << 24) | ((s[1] as u32) << 16) | ((s[2] as u32) << 8) | (s[3] as u32)
}

const SYSTEM_OBJECT: AudioObjectId = 1;
const SCOPE_GLOBAL: u32 = fourcc(b"glob");
const ELEMENT_MAIN: u32 = 0;
const PROCESS_OBJECT_LIST: u32 = fourcc(b"prs#");
const PROCESS_BUNDLE_ID: u32 = fourcc(b"pbid");
const PROCESS_IS_RUNNING_INPUT: u32 = fourcc(b"piri");
const DEFAULT_INPUT_DEVICE: u32 = fourcc(b"dIn ");
const DEVICE_IS_RUNNING_SOMEWHERE: u32 = fourcc(b"gone");
const CF_STRING_ENCODING_UTF8: u32 = 0x0800_0100;

#[link(name = "CoreAudio", kind = "framework")]
extern "C" {
    fn AudioObjectGetPropertyDataSize(
        object: AudioObjectId,
        address: *const PropertyAddress,
        qualifier_size: u32,
        qualifier: *const c_void,
        out_size: *mut u32,
    ) -> OsStatus;
    fn AudioObjectGetPropertyData(
        object: AudioObjectId,
        address: *const PropertyAddress,
        qualifier_size: u32,
        qualifier: *const c_void,
        io_size: *mut u32,
        out_data: *mut c_void,
    ) -> OsStatus;
}

#[link(name = "CoreFoundation", kind = "framework")]
extern "C" {
    fn CFStringGetCString(s: *const c_void, buf: *mut c_char, size: isize, encoding: u32) -> u8;
    fn CFRelease(obj: *const c_void);
}

/// Bundle ID prefixes of apps we treat as "on a call" when they capture the mic.
/// Browsers capture through helper processes (`com.google.Chrome.helper`),
/// hence prefix matching. Safari captures through the shared WebKit GPU process.
const MEETING_APP_PREFIXES: &[&str] = &[
    "us.zoom.",
    "com.microsoft.teams",
    "cisco-systems.spark",
    "com.webex.",
    "com.google.chrome",
    "com.microsoft.edgemac",
    "com.brave.browser",
    "company.thebrowser.browser",
    "com.vivaldi.vivaldi",
    "com.operasoftware.opera",
    "org.mozilla.firefox",
    "com.apple.safari",
    "com.apple.webkit.gpu",
];

fn is_meeting_app(bundle_id: &str) -> bool {
    let id = bundle_id.to_ascii_lowercase();
    MEETING_APP_PREFIXES.iter().any(|p| id.starts_with(p))
}

fn address(selector: u32) -> PropertyAddress {
    PropertyAddress {
        selector,
        scope: SCOPE_GLOBAL,
        element: ELEMENT_MAIN,
    }
}

fn get_u32(object: AudioObjectId, selector: u32) -> Option<u32> {
    let mut value: u32 = 0;
    let mut size = std::mem::size_of::<u32>() as u32;
    let status = unsafe {
        AudioObjectGetPropertyData(
            object,
            &address(selector),
            0,
            std::ptr::null(),
            &mut size,
            &mut value as *mut u32 as *mut c_void,
        )
    };
    (status == 0).then_some(value)
}

fn bundle_id(process: AudioObjectId) -> Option<String> {
    let mut cf: *const c_void = std::ptr::null();
    let mut size = std::mem::size_of::<*const c_void>() as u32;
    let status = unsafe {
        AudioObjectGetPropertyData(
            process,
            &address(PROCESS_BUNDLE_ID),
            0,
            std::ptr::null(),
            &mut size,
            &mut cf as *mut *const c_void as *mut c_void,
        )
    };
    if status != 0 || cf.is_null() {
        return None;
    }
    let mut buf = [0 as c_char; 256];
    let ok = unsafe { CFStringGetCString(cf, buf.as_mut_ptr(), buf.len() as isize, CF_STRING_ENCODING_UTF8) };
    unsafe { CFRelease(cf) };
    if ok == 0 {
        return None;
    }
    Some(unsafe { CStr::from_ptr(buf.as_ptr()) }.to_string_lossy().into_owned())
}

/// Bundle IDs of processes currently capturing audio input, or `None`
/// when the system doesn't support the per-process list (before macOS 14.2).
fn capturing_bundle_ids() -> Option<Vec<String>> {
    let addr = address(PROCESS_OBJECT_LIST);
    let mut size: u32 = 0;
    let status = unsafe {
        AudioObjectGetPropertyDataSize(SYSTEM_OBJECT, &addr, 0, std::ptr::null(), &mut size)
    };
    if status != 0 {
        return None;
    }
    let mut processes = vec![0 as AudioObjectId; size as usize / std::mem::size_of::<AudioObjectId>()];
    let status = unsafe {
        AudioObjectGetPropertyData(
            SYSTEM_OBJECT,
            &addr,
            0,
            std::ptr::null(),
            &mut size,
            processes.as_mut_ptr() as *mut c_void,
        )
    };
    if status != 0 {
        return None;
    }
    Some(
        processes
            .into_iter()
            .filter(|&p| get_u32(p, PROCESS_IS_RUNNING_INPUT).unwrap_or(0) != 0)
            .filter_map(bundle_id)
            .collect(),
    )
}

fn default_input_is_running() -> bool {
    get_u32(SYSTEM_OBJECT, DEFAULT_INPUT_DEVICE)
        .filter(|&device| device != 0)
        .and_then(|device| get_u32(device, DEVICE_IS_RUNNING_SOMEWHERE))
        .unwrap_or(0)
        != 0
}

/// True when a meeting app or browser is capturing the microphone.
pub fn is_on_call() -> bool {
    match capturing_bundle_ids() {
        Some(ids) => {
            if !ids.is_empty() {
                log::debug!("Apps capturing the mic: {:?}", ids);
            }
            ids.iter().any(|id| is_meeting_app(id))
        }
        None => default_input_is_running(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn browser_helpers_count_as_meeting_apps() {
        assert!(is_meeting_app("com.google.Chrome.helper"));
        assert!(is_meeting_app("com.google.chrome.for.testing.helper"));
        assert!(is_meeting_app("company.thebrowser.Browser.helper"));
        assert!(is_meeting_app("com.apple.WebKit.GPU"));
    }

    #[test]
    fn native_meeting_apps_count() {
        assert!(is_meeting_app("us.zoom.xos"));
        assert!(is_meeting_app("com.microsoft.teams2"));
        assert!(is_meeting_app("Cisco-Systems.Spark"));
    }

    #[test]
    fn always_on_mic_apps_do_not_count() {
        assert!(!is_meeting_app("com.apple.CoreSpeech"));
        assert!(!is_meeting_app("com.krisp.krispMac"));
        assert!(!is_meeting_app("com.tinyspeck.slackmacgap.helper"));
    }
}
