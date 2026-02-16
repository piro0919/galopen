import { invoke } from "@tauri-apps/api/core";
import type { CalendarEvent, CalendarInfo } from "../types";

export const checkCalendarPermission = () =>
  invoke<string>("check_calendar_permission");

export const requestCalendarPermission = () =>
  invoke<boolean>("request_calendar_permission");

export const getCalendars = () => invoke<CalendarInfo[]>("get_calendars");

export const getTodaysEvents = () =>
  invoke<CalendarEvent[]>("get_todays_events");

export const forceSync = () => invoke<CalendarEvent[]>("force_sync");

export const openCalendarSettings = () => invoke("open_calendar_settings");
