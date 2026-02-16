interface Messages {
  appName: string;
  subtitle: string;
  calendars: string;
  close: string;
  permissionDesc: string;
  grantAccess: string;
  deniedMsg: string;
  restrictedMsg: string;
  allDay: string;
  noTitle: string;
  todaysSchedule: string;
  loadingEvents: string;
  noEvents: string;
  other: string;
  loading: string;
  settings: string;
  openBefore: string;
  minutesBefore: string;
  startAtLogin: string;
  openSettings: string;
  quitApp: string;
  countdownPrefix: string;
  countdownSuffix: string;
  now: string;
  copyUrl: string;
  copied: string;
  trayMinSuffix: string;
  tomorrow: string;
  trayCountdown: string;
  trayMinutes: string;
  trayAlways: string;
}

const ja: Messages = {
  appName: "Galopen",
  subtitle: "カレンダー会議自動オープナー",
  calendars: "カレンダー",
  close: "閉じる",
  permissionDesc:
    "Galopenは今日の予定を表示し、会議URLを自動で開くためにカレンダーへのアクセスが必要です。",
  grantAccess: "カレンダーへのアクセスを許可",
  deniedMsg:
    "カレンダーへのアクセスが拒否されました。システム設定 > プライバシーとセキュリティ > カレンダー から許可してください。",
  restrictedMsg:
    "このデバイスではカレンダーへのアクセスが制限されています。",
  allDay: "終日",
  noTitle: "（タイトルなし）",
  todaysSchedule: "今日の予定",
  loadingEvents: "予定を読み込み中...",
  noEvents: "予定はありません",
  other: "その他",
  loading: "読み込み中...",
  settings: "設定",
  openBefore: "会議URLを開くタイミング",
  minutesBefore: "分前",
  startAtLogin: "ログイン時に自動起動",
  openSettings: "システム設定を開く",
  quitApp: "Galopen を終了",
  countdownPrefix: "あと",
  countdownSuffix: "分",
  now: "開催中",
  copyUrl: "URLをコピー",
  copied: "コピー済み",
  trayMinSuffix: "分",
  tomorrow: "明日の予定",
  trayCountdown: "トレイのカウントダウン",
  trayMinutes: "分前から",
  trayAlways: "常に表示",
};

const en: Messages = {
  appName: "Galopen",
  subtitle: "Calendar meeting auto-opener",
  calendars: "Calendars",
  close: "Close",
  permissionDesc:
    "Galopen needs access to your calendars to show today's events and auto-open meeting URLs.",
  grantAccess: "Grant Calendar Access",
  deniedMsg:
    "Calendar access was denied. Please grant access in System Settings > Privacy & Security > Calendars.",
  restrictedMsg: "Calendar access is restricted on this device.",
  allDay: "All day",
  noTitle: "(No title)",
  todaysSchedule: "Today's Schedule",
  loadingEvents: "Loading events...",
  noEvents: "No events",
  other: "Other",
  loading: "Loading...",
  settings: "Settings",
  openBefore: "Open meeting URL",
  minutesBefore: "min before",
  startAtLogin: "Start at login",
  openSettings: "Open System Settings",
  quitApp: "Quit Galopen",
  countdownPrefix: "In ",
  countdownSuffix: " min",
  now: "Now",
  copyUrl: "Copy URL",
  copied: "Copied",
  trayMinSuffix: "m",
  tomorrow: "Tomorrow",
  trayCountdown: "Tray countdown",
  trayMinutes: "min before",
  trayAlways: "Always",
};

export const t: Messages = navigator.language.startsWith("ja") ? ja : en;
