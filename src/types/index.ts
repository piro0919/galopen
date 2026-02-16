export interface EventDateTime {
  dateTime: string | null;
  date: string | null;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  start: EventDateTime;
  end: EventDateTime;
  description: string | null;
  location: string | null;
  url: string | null;
  isAllDay: boolean;
  status: string | null;
  calendarId: string | null;
  calendarName: string | null;
  externalUrl: string | null;
}

export interface CalendarInfo {
  id: string;
  title: string;
  sourceName: string;
}
