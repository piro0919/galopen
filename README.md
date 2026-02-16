# Galopen

macOS menu bar app that auto-opens meeting URLs (Zoom, Google Meet, Teams, Webex) from your calendar.

No setup required - works with any calendar already configured in macOS (Google, iCloud, Outlook, etc.) via EventKit.

## Features

- Auto-opens meeting URLs before the meeting starts (configurable: 1-10 min)
- Supports Zoom, Google Meet, Microsoft Teams, Webex
- Shows today's schedule in a compact window
- Calendar filter for multiple accounts
- Click event title to open in source calendar
- Click meeting badge to join directly
- Japanese / English auto-detection based on system locale
- Runs in menu bar only (no Dock icon)

## Requirements

- macOS 14.0+
- Calendar access permission

## Development

```bash
pnpm install
pnpm tauri dev        # Dev server (note: calendar permission requires .app bundle)
pnpm tauri build --debug   # Debug build with full functionality
```

## Tech Stack

- [Tauri v2](https://v2.tauri.app/) (Rust backend)
- React + Vite + TypeScript (frontend)
- macOS EventKit via [objc2-event-kit](https://crates.io/crates/objc2-event-kit)

## License

MIT
