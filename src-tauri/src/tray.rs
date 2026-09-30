/// Show zero, one or two lines next to the tray icon.
///
/// Tauri only supports a single-line title, so two lines are drawn by setting
/// an attributed title on the underlying `NSStatusBarButton` directly.
pub fn set_tray_lines(app: &tauri::AppHandle, lines: &[String]) {
    let Some(tray) = app.tray_by_id("main") else {
        return;
    };

    match lines {
        [top, bottom] => {
            let (top, bottom) = (top.clone(), bottom.clone());
            let result = tray.with_inner_tray_icon(move |inner| {
                if let Some(item) = inner.ns_status_item() {
                    set_two_line_title(&item, &top, &bottom);
                }
                // tray-icon keeps a click-catching view on top of the button and
                // only resizes it from its own setters. Setting the tooltip is the
                // cheapest one that re-syncs it with the new button width.
                if let Err(e) = inner.set_tooltip(None::<&str>) {
                    log::warn!("Failed to resync tray click area: {}", e);
                }
            });
            if let Err(e) = result {
                log::error!("Failed to set two-line tray title: {}", e);
            }
        }
        _ => {
            // Use empty string to clear title instead of None
            // None might mean "don't change" rather than "clear"
            let title = lines.first().map(String::as_str).unwrap_or("");
            if let Err(e) = tray.set_title(Some(title)) {
                log::error!("Failed to set tray title: {}", e);
            }
        }
    }
}

/// Two lines of small text fit the menu bar height; digits are monospaced so
/// the width doesn't jitter as the countdown ticks.
fn set_two_line_title(item: &objc2_app_kit::NSStatusItem, top: &str, bottom: &str) {
    use objc2_app_kit::{
        NSBaselineOffsetAttributeName, NSFont, NSFontAttributeName, NSFontWeightRegular,
        NSMutableParagraphStyle, NSParagraphStyleAttributeName,
    };
    use objc2_foundation::{MainThreadMarker, NSMutableAttributedString, NSNumber, NSRange, NSString};

    const FONT_SIZE: f64 = 10.0;
    const LINE_HEIGHT: f64 = 11.0;
    // The status bar button lays a multi-line title out from its top edge,
    // so push the text down to sit in the middle of the menu bar.
    const BASELINE_OFFSET: f64 = -5.0;

    let Some(mtm) = MainThreadMarker::new() else {
        return;
    };
    let Some(button) = item.button(mtm) else {
        return;
    };

    let text = NSString::from_str(&format!("{}\n{}", top, bottom));
    let attributed = NSMutableAttributedString::from_nsstring(&text);
    let range = NSRange::new(0, text.length());
    let font = NSFont::monospacedDigitSystemFontOfSize_weight(FONT_SIZE, unsafe { NSFontWeightRegular });
    let style = NSMutableParagraphStyle::new();
    style.setMinimumLineHeight(LINE_HEIGHT);
    style.setMaximumLineHeight(LINE_HEIGHT);
    unsafe {
        attributed.addAttribute_value_range(NSFontAttributeName, &font, range);
        attributed.addAttribute_value_range(NSParagraphStyleAttributeName, &style, range);
        attributed.addAttribute_value_range(
            NSBaselineOffsetAttributeName,
            &NSNumber::new_f64(BASELINE_OFFSET),
            range,
        );
    }
    button.setAttributedTitle(&attributed);
}
