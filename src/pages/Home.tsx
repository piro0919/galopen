import { Calendar, Settings as SettingsIcon, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { isEnabled } from "@tauri-apps/plugin-autostart";
import { CalendarFilter } from "../components/CalendarFilter";
import { EventList } from "../components/EventList";
import { Settings } from "../components/Settings";
import { useCalendars } from "../hooks/useCalendars";
import { useDisplaySettings } from "../hooks/useDisplaySettings";
import { useEvents } from "../hooks/useEvents";
import { t } from "../i18n";
import { computeVisibleDates } from "../lib/dateRange";

function IconButton({
  icon: Icon,
  active,
  onClick,
  title,
}: {
  icon: React.ElementType;
  active?: boolean;
  onClick: () => void;
  title?: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={title}
      style={{
        width: 28,
        height: 28,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "none",
        borderRadius: 6,
        cursor: "pointer",
        transition: "all 0.15s ease",
        background: active
          ? "var(--primary)"
          : hovered
            ? "var(--bg-hover)"
            : "transparent",
        color: active ? "#fff" : hovered ? "var(--text-primary)" : "var(--text-secondary)",
      }}
    >
      <Icon size={16} strokeWidth={1.75} />
    </button>
  );
}

export function Home() {
  const { events, loading } = useEvents();
  const { calendars, enabledIds, loaded, toggleCalendar } = useCalendars();
  const { range, weekdaysOnly, setRange, setWeekdaysOnly } = useDisplaySettings();
  const [showFilter, setShowFilter] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [autostart, setAutostart] = useState<boolean | null>(null);

  // Update `now` every 30s to re-filter ended events
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    isEnabled().then(setAutostart).catch(() => setAutostart(false));
  }, []);

  const calendarFiltered = useMemo(() => {
    const base = loaded
      ? events.filter((e) => !e.calendarId || enabledIds.has(e.calendarId))
      : events;
    return base.filter((e) => {
      if (e.isAllDay) return true;
      const end = e.end.dateTime ? new Date(e.end.dateTime) : null;
      return !end || end > now;
    });
  }, [events, enabledIds, loaded, now]);

  const filteredEvents = useMemo(() => {
    const visible = computeVisibleDates(range, weekdaysOnly, calendarFiltered, now);
    return calendarFiltered.filter((e) => {
      const key = e.start.dateTime
        ? new Date(e.start.dateTime).toLocaleDateString("sv-SE")
        : (e.start.date ?? "");
      return visible.has(key);
    });
  }, [calendarFiltered, range, weekdaysOnly, now]);

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <span style={styles.appName}>{t.appName}</span>
        <div style={styles.topBarActions}>
          {calendars.length > 1 && (
            <IconButton
              icon={showFilter ? X : Calendar}
              active={showFilter}
              onClick={() => {
                setShowFilter((v) => !v);
                setShowSettings(false);
              }}
              title={showFilter ? t.close : t.calendars}
            />
          )}
          <IconButton
            icon={showSettings ? X : SettingsIcon}
            active={showSettings}
            onClick={() => {
              setShowSettings((v) => !v);
              setShowFilter(false);
            }}
            title={showSettings ? t.close : t.settings}
          />
        </div>
      </div>
      {showFilter && (
        <CalendarFilter
          calendars={calendars}
          enabledIds={enabledIds}
          onToggle={toggleCalendar}
        />
      )}
      {showSettings && (
        <Settings
          autostart={autostart}
          onAutostartChange={setAutostart}
          displayRange={range}
          onDisplayRangeChange={setRange}
          weekdaysOnly={weekdaysOnly}
          onWeekdaysOnlyChange={setWeekdaysOnly}
        />
      )}
      <EventList events={filteredEvents} loading={loading} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    background: "var(--bg-main)",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 16px",
    background: "var(--bg-topbar)",
    boxShadow: "var(--shadow-topbar)",
  },
  topBarActions: {
    display: "flex",
    gap: 4,
  },
  appName: {
    fontSize: 15,
    fontWeight: 600,
    color: "var(--text-primary)",
    letterSpacing: "-0.2px",
  },
};
