import { t } from "../i18n";
import type { CalendarEvent } from "../types";
import { EventCard } from "./EventCard";

export function EventList({
  events,
  loading,
  onRefresh,
}: {
  events: CalendarEvent[];
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <div>
      <div style={styles.header}>
        <h2 style={styles.title}>{t.todaysSchedule}</h2>
        <button onClick={onRefresh} disabled={loading} style={styles.syncBtn}>
          {loading ? t.syncing : t.sync}
        </button>
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
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    borderBottom: "1px solid #ddd",
  },
  title: {
    fontSize: 16,
    margin: 0,
  },
  syncBtn: {
    fontSize: 12,
    padding: "4px 12px",
    borderRadius: 4,
    border: "1px solid #ccc",
    background: "#fff",
    cursor: "pointer",
  },
  empty: {
    textAlign: "center",
    color: "#999",
    padding: 40,
  },
};
