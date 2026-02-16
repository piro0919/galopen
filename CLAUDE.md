# Galopen

macOSカレンダー(EventKit)と連携し、会議の開始時刻になったらZoom/Google Meet/Teamsなどの会議URLを自動で開くmacOSメニューバーアプリ。

## Tech Stack

- **Tauri v2** (Rust backend)
- **React + Vite + TypeScript** (frontend)
- **pnpm** (package manager)
- **macOS EventKit** (`objc2-event-kit` crate) — カレンダーデータ取得

## Architecture

### Rust Backend (`src-tauri/src/`)

- `lib.rs` — メイン: Builder, tray, plugin登録, scheduler起動。Dockアイコン非表示(`ActivationPolicy::Accessory`)
- `calendar.rs` — macOS EventKitクライアント。専用スレッド+チャネルでEKEventStoreを安全に管理。権限チェック/リクエスト、イベント取得
- `meeting_url.rs` — イベントからの会議URL抽出(優先順: event URL > location > description)
- `scheduler.rs` — 30秒ごとにイベント開始時刻チェック。N分前に通知+URL自動オープン。HashSetで重複防止

### Frontend (`src/`)

- `App.tsx` — カレンダー権限状態でPermissionRequest/Homeを切り替え
- `pages/PermissionRequest.tsx` — カレンダーアクセス権限リクエスト画面
- `pages/Home.tsx` — 今日の予定一覧 + カレンダーフィルター + 設定パネル
- `components/EventCard.tsx` — 個別イベント表示(時刻、タイトル、会議サービスバッジ、カレンダー色ドット)
- `components/EventList.tsx` — イベントリスト + 同期ボタン
- `components/CalendarFilter.tsx` — カレンダー表示/非表示フィルター(ソース別グループ)
- `components/Settings.tsx` — 会議URL自動オープンのタイミング設定(tauri-plugin-store永続化)
- `i18n.ts` — 英語/日本語辞書 + `navigator.language`ロケール判定
- `lib/tauri.ts` — Tauri invokeラッパー
- `hooks/usePermission.ts`, `useEvents.ts`, `useCalendars.ts` — 状態管理フック

## Key Design Decisions

- **EventKit採用**: macOSシステムカレンダーから直接イベントを取得。Google/Outlook/iCloud等、ユーザーが設定済みの全カレンダーに自動対応。OAuth認証不要
- **スレッド安全性**: EKEventStoreはSend/Syncでないため、専用スレッド+`mpsc::channel`でコマンドを送受信
- **ポーリング方式**: EventKitのpredicateで5分間隔にイベント取得。ローカルAPIなので軽量
- **URL自動オープン**: `open` crateでシステムデフォルトブラウザ/アプリで開く
- **Next.jsを不採用**: Tauriでは静的エクスポートが必須でNext.jsの利点が消えるため、React + Viteを採用

## Commands

```bash
pnpm tauri dev      # 開発サーバー起動
pnpm tauri build    # プロダクションビルド (.app)
```

## TODO

- [ ] トレイメニューに次の予定・今日のスケジュール表示
- [ ] アプリアイコンのカスタマイズ
