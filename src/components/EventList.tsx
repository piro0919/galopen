import { CalendarDays, Loader2 } from "lucide-react";
import { useMemo } from "react";
import { t } from "../i18n";
import type { CalendarEvent } from "../types";
import { holidayName, isWeekend } from "../lib/dateRange";
import { EventCard } from "./EventCard";

function getDateKey(event: CalendarEvent): string {
  if (event.start.dateTime) {
    return new Date(event.start.dateTime).toLocaleDateString("sv-SE"); // YYYY-MM-DD
  }
  return event.start.date ?? "";
}

function formatDateLabel(dateKey: string): string {
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const todayStr = today.toLocaleDateString("sv-SE");
  const tomorrowStr = tomorrow.toLocaleDateString("sv-SE");

  const d = new Date(`${dateKey}T00:00:00`);
  const short = d.toLocaleDateString(navigator.language, {
    month: "numeric",
    day: "numeric",
    weekday: "short",
  });

  const holiday = holidayName(d);
  const suffix = holiday ? ` · ${holiday}` : isWeekend(d) ? ` · ${t.weekend}` : "";

  if (dateKey === todayStr) return `${t.todaysSchedule} (${short})${suffix}`;
  if (dateKey === tomorrowStr) return `${t.tomorrow} (${short})${suffix}`;
  return `${short}${suffix}`;
}

export function EventList({
  events,
  loading,
}: {
  events: CalendarEvent[];
  loading: boolean;
}) {
  const todayStrInit = new Date().toLocaleDateString("sv-SE");

  const grouped = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    // Always reserve a slot for today so the header (and any holiday name) shows
    // even when today has no events.
    map.set(todayStrInit, []);
    for (const event of events) {
      const key = getDateKey(event);
      const arr = map.get(key);
      if (arr) arr.push(event);
      else map.set(key, [event]);
    }
    return [...map.entries()];
  }, [events, todayStrInit]);

  if (loading) {
    return (
      <div style={styles.empty}>
        <Loader2
          size={24}
          strokeWidth={1.75}
          color="var(--text-tertiary)"
          className="spin"
        />
        <span style={styles.emptyText}>{t.loadingEvents}</span>
      </div>
    );
  }


  // Show countdown for: the very next event (always) + any within 4 hours, today only
  const now = new Date();
  const todayStr = now.toLocaleDateString("sv-SE");
  const horizon = now.getTime() + 4 * 60 * 60 * 1000;
  const nextIds = new Set<string>();
  let foundFirst = false;
  for (const e of events) {
    if (e.isAllDay || !e.start.dateTime) continue;
    const start = new Date(e.start.dateTime);
    if (start <= now || start.toLocaleDateString("sv-SE") !== todayStr) continue;
    if (!foundFirst || start.getTime() <= horizon) {
      nextIds.add(e.id);
      foundFirst = true;
    } else {
      break;
    }
  }

  return (
    <div>
      {grouped.map(([dateKey, dayEvents]) => (
        <div key={dateKey}>
          <div style={styles.header}>
            <CalendarDays size={14} strokeWidth={1.75} color="var(--text-secondary)" />
            <h2 style={styles.title}>{formatDateLabel(dateKey)}</h2>
          </div>
          <div style={styles.list}>
            {dayEvents.length === 0 ? (
              <span style={styles.emptyDay}>{t.noEvents}</span>
            ) : (
              dayEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  isNext={nextIds.has(event.id)}
                />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "14px 16px 8px",
  },
  title: {
    fontSize: 12,
    fontWeight: 600,
    color: "var(--text-secondary)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    margin: 0,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    padding: "4px 12px 12px",
  },
  empty: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
    padding: "48px 40px",
  },
  emptyText: {
    fontSize: 13,
    color: "var(--text-tertiary)",
  },
  emptyDay: {
    fontSize: 12,
    color: "var(--text-tertiary)",
    padding: "4px 4px",
  },
};
