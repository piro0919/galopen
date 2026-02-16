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
  sync: string;
  syncing: string;
  loadingEvents: string;
  noEvents: string;
  other: string;
  loading: string;
  settings: string;
  openBefore: string;
  minutesBefore: string;
  startAtLogin: string;
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
  sync: "同期",
  syncing: "同期中...",
  loadingEvents: "予定を読み込み中...",
  noEvents: "今日の予定はありません",
  other: "その他",
  loading: "読み込み中...",
  settings: "設定",
  openBefore: "会議URLを開くタイミング",
  minutesBefore: "分前",
  startAtLogin: "ログイン時に自動起動",
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
  sync: "Sync",
  syncing: "Syncing...",
  loadingEvents: "Loading events...",
  noEvents: "No events today",
  other: "Other",
  loading: "Loading...",
  settings: "Settings",
  openBefore: "Open meeting URL",
  minutesBefore: "min before",
  startAtLogin: "Start at login",
};

export const t: Messages = navigator.language.startsWith("ja") ? ja : en;
