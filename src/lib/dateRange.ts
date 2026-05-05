import Holidays from "date-holidays";
import type { CalendarEvent } from "../types";

function detectCountry(): string {
  const lang = navigator.language;
  const parts = lang.split("-");
  if (parts[1]) return parts[1].toUpperCase();
  const map: Record<string, string> = {
    ja: "JP",
    en: "US",
    zh: "CN",
    ko: "KR",
    de: "DE",
    fr: "FR",
    es: "ES",
    it: "IT",
    pt: "PT",
  };
  return map[parts[0].toLowerCase()] ?? "US";
}

let _hd: Holidays | null = null;
function getHd(): Holidays {
  if (!_hd) {
    try {
      _hd = new Holidays(detectCountry());
    } catch {
      _hd = new Holidays("US");
    }
  }
  return _hd;
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function isHoliday(date: Date): boolean {
  return holidayName(date) !== null;
}

export function holidayName(date: Date): string | null {
  const result = getHd().isHoliday(date);
  if (!result || !Array.isArray(result)) return null;
  const match = result.find((h) => h.type === "public" || h.type === "bank");
  return match?.name ?? null;
}

export function isBusinessDay(date: Date): boolean {
  return !isWeekend(date) && !isHoliday(date);
}

function dateKey(date: Date): string {
  return date.toLocaleDateString("sv-SE");
}

function eventDateKey(event: CalendarEvent): string {
  if (event.start.dateTime) {
    return new Date(event.start.dateTime).toLocaleDateString("sv-SE");
  }
  return event.start.date ?? "";
}

/**
 * Compute the set of date keys (YYYY-MM-DD) that should be visible.
 *
 * - weekdaysOnly = false: today through today + (range - 1).
 * - weekdaysOnly = true: walk forward until `range` business days are included,
 *   plus any weekend/holiday in between that has events. Pure-empty weekend/holiday
 *   days are hidden.
 */
export function computeVisibleDates(
  range: number,
  weekdaysOnly: boolean,
  events: CalendarEvent[],
  today: Date = new Date(),
): Set<string> {
  const visible = new Set<string>();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (!weekdaysOnly) {
    for (let i = 0; i < range; i++) {
      const d = new Date(todayMidnight);
      d.setDate(d.getDate() + i);
      visible.add(dateKey(d));
    }
    return visible;
  }

  // Always show today, even when it's a weekend or holiday — otherwise
  // the user has no clue why the list is empty.
  visible.add(dateKey(todayMidnight));

  const eventDates = new Set(events.map(eventDateKey).filter(Boolean));

  let businessCount = isBusinessDay(todayMidnight) ? 1 : 0;
  for (let offset = 1; offset < 14 && businessCount < range; offset++) {
    const d = new Date(todayMidnight);
    d.setDate(d.getDate() + offset);
    const key = dateKey(d);
    if (isBusinessDay(d)) {
      visible.add(key);
      businessCount++;
    } else if (eventDates.has(key)) {
      visible.add(key);
    }
  }
  return visible;
}
