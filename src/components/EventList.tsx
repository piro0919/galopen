import { CalendarDays, CalendarOff, Loader2 } from "lucide-react";
import { useMemo } from "react";
import { t } from "../i18n";
import type { CalendarEvent } from "../types";
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

  if (dateKey === todayStr) return t.todaysSchedule;
  if (dateKey === tomorrowStr) return t.tomorrow;
  // For other dates, show localized date
  const d = new Date(`${dateKey}T00:00:00`);
  return d.toLocaleDateString(navigator.language, {
    month: "numeric",
    day: "numeric",
    weekday: "short",
  });
}

export function EventList({
  events,
  loading,
}: {
  events: CalendarEvent[];
  loading: boolean;
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const key = getDateKey(event);
      const arr = map.get(key);
      if (arr) arr.push(event);
      else map.set(key, [event]);
    }
    return [...map.entries()];
  }, [events]);

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

  if (events.length === 0) {
    return (
      <div style={styles.empty}>
        <CalendarOff size={32} strokeWidth={1.5} color="var(--text-tertiary)" />
        <span style={styles.emptyText}>{t.noEvents}</span>
      </div>
    );
  }

  // Track which is the first non-all-day future event across all groups
  const now = new Date();
  const firstNextId = events.find((e) => {
    if (e.isAllDay || !e.start.dateTime) return false;
    return new Date(e.start.dateTime) > now;
  })?.id;

  return (
    <div>
      {grouped.map(([dateKey, dayEvents]) => (
        <div key={dateKey}>
          <div style={styles.header}>
            <CalendarDays size={14} strokeWidth={1.75} color="var(--text-secondary)" />
            <h2 style={styles.title}>{formatDateLabel(dateKey)}</h2>
          </div>
          <div style={styles.list}>
            {dayEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                isNext={event.id === firstNextId}
              />
            ))}
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
};
