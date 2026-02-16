# Galopen

<p align="center">
  <img src="docs/icon-rounded.png" alt="Galopen" width="128" height="128" />
</p>

<p align="center">
  <strong>macOS menu bar app that auto-opens meeting URLs from your calendar.</strong>
</p>

<p align="center">
  <a href="https://galopen.kkweb.io">Website</a> ·
  <a href="https://github.com/piro0919/galopen/releases/latest">Download</a> ·
  <a href="https://buymeacoffee.com/piro0919">Buy Me a Coffee</a>
</p>

---

No setup required - works with any calendar already configured in macOS (Google, iCloud, Outlook, etc.) via EventKit.

## Features

- Auto-opens meeting URLs before the meeting starts (configurable: 1-10 min)
- Supports Zoom, Google Meet, Microsoft Teams, Webex
- Shows today's and tomorrow's schedule in a compact window
- Countdown timer in the menu bar (configurable threshold)
- Calendar filter for multiple accounts
- Click event title to open in source calendar
- Click meeting badge to join directly
- Japanese / English auto-detection based on system locale
- Auto-update on startup
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

### Landing Page (`lp/`)

```bash
pnpm --filter galopen-lp dev    # Next.js dev server
pnpm --filter galopen-lp build  # Production build
```

## Tech Stack

- [Tauri v2](https://v2.tauri.app/) (Rust backend)
- React + Vite + TypeScript (frontend)
- macOS EventKit via [objc2-event-kit](https://crates.io/crates/objc2-event-kit)
- Landing page: Next.js 16 + Tailwind CSS v4 + next-intl

## License

MIT
