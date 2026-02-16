import { useMemo, useState } from "react";
import { CalendarFilter } from "../components/CalendarFilter";
import { EventList } from "../components/EventList";
import { Settings } from "../components/Settings";
import { useCalendars } from "../hooks/useCalendars";
import { useEvents } from "../hooks/useEvents";
import { t } from "../i18n";

export function Home() {
  const { events, loading, refresh } = useEvents();
  const { calendars, enabledIds, loaded, toggleCalendar } = useCalendars();
  const [showFilter, setShowFilter] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const filteredEvents = useMemo(
    () =>
      loaded
        ? events.filter((e) => !e.calendarId || enabledIds.has(e.calendarId))
        : events,
    [events, enabledIds, loaded],
  );

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <span style={styles.appName}>{t.appName}</span>
        <div style={styles.topBarActions}>
          {calendars.length > 1 && (
            <button
              type="button"
              onClick={() => {
                setShowFilter((v) => !v);
                setShowSettings(false);
              }}
              style={styles.filterBtn}
            >
              {showFilter ? t.close : t.calendars}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setShowSettings((v) => !v);
              setShowFilter(false);
            }}
            style={styles.filterBtn}
          >
            {showSettings ? t.close : t.settings}
          </button>
        </div>
      </div>
      {showFilter && (
        <CalendarFilter
          calendars={calendars}
          enabledIds={enabledIds}
          onToggle={toggleCalendar}
        />
      )}
      {showSettings && <Settings />}
      <EventList
        events={filteredEvents}
        loading={loading}
        onRefresh={refresh}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    borderBottom: "1px solid #ddd",
    background: "#fafafa",
  },
  topBarActions: {
    display: "flex",
    gap: 8,
  },
  appName: {
    fontSize: 16,
    fontWeight: 700,
  },
  filterBtn: {
    fontSize: 12,
    padding: "4px 12px",
    borderRadius: 4,
    border: "1px solid #ccc",
    background: "#fff",
    cursor: "pointer",
  },
};
