import { invoke } from "@tauri-apps/api/core";
import type { CalendarEvent, CalendarInfo } from "../types";

export interface AppOption {
  id: string;
  name: string;
  serviceHint: string | null;
}

export const checkCalendarPermission = () =>
  invoke<string>("check_calendar_permission");

export const requestCalendarPermission = () =>
  invoke<boolean>("request_calendar_permission");

export const getCalendars = () => invoke<CalendarInfo[]>("get_calendars");

export const getTodaysEvents = () =>
  invoke<CalendarEvent[]>("get_todays_events");

export const forceSync = () => invoke<CalendarEvent[]>("force_sync");

export const openCalendarSettings = () => invoke("open_calendar_settings");

export const getInstalledApps = () => invoke<AppOption[]>("get_installed_apps");

export const openMeetingUrl = (url: string, account?: string | null) =>
  invoke("open_meeting_url", { url, account: account ?? null });
