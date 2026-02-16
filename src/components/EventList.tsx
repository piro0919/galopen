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
        <h2 style={styles.title}>{t.todaysSchedule}</h2>
      </div>
      {events.length === 0 ? (
        <p style={styles.empty}>
          {loading ? t.loadingEvents : t.noEvents}
        </p>
      ) : (
        events.map((event) => <EventCard key={event.id} event={event} />)
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    padding: "12px 16px",
    borderBottom: "1px solid #ddd",
  },
  title: {
    fontSize: 16,
    margin: 0,
  },
  empty: {
    textAlign: "center",
    color: "#999",
    padding: 40,
  },
};
