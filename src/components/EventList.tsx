import { CalendarDays, CalendarOff, Loader2 } from "lucide-react";
import { t } from "../i18n";
import type { CalendarEvent } from "../types";
import { EventCard } from "./EventCard";

export function EventList({
  events,
  loading,
}: {
  events: CalendarEvent[];
  loading: boolean;
}) {
  return (
    <div>
      <div style={styles.header}>
        <CalendarDays size={14} strokeWidth={1.75} color="#6E6E73" />
        <h2 style={styles.title}>{t.todaysSchedule}</h2>
      </div>
      {loading ? (
        <div style={styles.empty}>
          <Loader2
            size={24}
            strokeWidth={1.75}
            color="#AEAEB2"
            className="spin"
          />
          <span style={styles.emptyText}>{t.loadingEvents}</span>
        </div>
      ) : events.length === 0 ? (
        <div style={styles.empty}>
          <CalendarOff size={32} strokeWidth={1.5} color="#AEAEB2" />
          <span style={styles.emptyText}>{t.noEvents}</span>
        </div>
      ) : (
        <div style={styles.list}>
          {events.map((event, i) => (
            <EventCard key={event.id} event={event} isNext={i === 0} />
          ))}
        </div>
      )}
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
    color: "#6E6E73",
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
    color: "#AEAEB2",
  },
};
