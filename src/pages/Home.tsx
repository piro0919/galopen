import { invoke } from "@tauri-apps/api/core";
import { Calendar, Settings as SettingsIcon, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CalendarFilter } from "../components/CalendarFilter";
import { EventList } from "../components/EventList";
import { Settings } from "../components/Settings";
import { useCalendars } from "../hooks/useCalendars";
import { useEvents } from "../hooks/useEvents";
import { t } from "../i18n";

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
          ? "#007AFF"
          : hovered
            ? "rgba(0,0,0,0.06)"
            : "transparent",
        color: active ? "#fff" : hovered ? "#1D1D1F" : "#6E6E73",
      }}
    >
      <Icon size={16} strokeWidth={1.75} />
    </button>
  );
}

export function Home() {
  const { events, loading } = useEvents();
  const { calendars, enabledIds, loaded, toggleCalendar } = useCalendars();
  const [showFilter, setShowFilter] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const filteredEvents = useMemo(() => {
    const now = new Date();
    const base = loaded
      ? events.filter((e) => !e.calendarId || enabledIds.has(e.calendarId))
      : events;
    return base
      .filter((e) => {
        // Keep all-day events and events that haven't ended yet
        if (e.isAllDay) return true;
        const end = e.end.dateTime ? new Date(e.end.dateTime) : null;
        return !end || end > now;
      })
      .slice(0, 5);
  }, [events, enabledIds, loaded]);

  // Update menu bar tray title with countdown to next event
  useEffect(() => {
    const updateTray = () => {
      const now = new Date();
      const base = loaded
        ? events.filter((e) => !e.calendarId || enabledIds.has(e.calendarId))
        : events;
      const next = base.find((e) => {
        if (e.isAllDay || !e.start.dateTime) return false;
        return new Date(e.start.dateTime) > now;
      });
      if (next?.start.dateTime) {
        const mins = Math.ceil(
          (new Date(next.start.dateTime).getTime() - now.getTime()) / 60000,
        );
        invoke("set_tray_title", { title: `${mins}${t.trayMinSuffix}` });
      } else {
        invoke("set_tray_title", { title: "" });
      }
    };
    updateTray();
    const id = setInterval(updateTray, 30_000);
    return () => clearInterval(id);
  }, [events, enabledIds, loaded]);

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
      {showSettings && <Settings />}
      <EventList events={filteredEvents} loading={loading} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    background: "#F5F5F7",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 16px",
    background: "#EBEBED",
    boxShadow: "0 1px 0 rgba(0,0,0,0.06)",
  },
  topBarActions: {
    display: "flex",
    gap: 4,
  },
  appName: {
    fontSize: 15,
    fontWeight: 600,
    color: "#1D1D1F",
    letterSpacing: "-0.2px",
  },
};
