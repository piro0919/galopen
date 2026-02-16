import { openUrl } from "@tauri-apps/plugin-opener";
import { t } from "../i18n";
import type { CalendarEvent } from "../types";
import { calendarColor } from "./CalendarFilter";

const URL_PATTERN =
  /https?:\/\/(?:[a-z0-9-]+\.)*(?:zoom\.us|meet\.google\.com|teams\.microsoft\.com|webex\.com)\S*/i;

const SERVICES: [RegExp, string][] = [
  [/zoom\.us/i, "Zoom"],
  [/meet\.google\.com/i, "Meet"],
  [/teams\.microsoft\.com/i, "Teams"],
  [/webex\.com/i, "Webex"],
];

function formatTime(event: CalendarEvent): string {
  const dt = event.start.dateTime;
  if (!dt) return t.allDay;
  const date = new Date(dt);
  return date.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getMeetingInfo(
  event: CalendarEvent,
): { type: string; url: string } | null {
  // Check URL property first
  if (event.url) {
    for (const [re, name] of SERVICES) {
      if (re.test(event.url)) return { type: name, url: event.url };
    }
  }

  // Extract URL from location and description
  const text = `${event.location ?? ""} ${event.description ?? ""}`;
  const match = text.match(URL_PATTERN);
  if (match) {
    for (const [re, name] of SERVICES) {
      if (re.test(match[0])) return { type: name, url: match[0] };
    }
  }

  return null;
}

export function EventCard({ event }: { event: CalendarEvent }) {
  const time = formatTime(event);
  const meeting = getMeetingInfo(event);
  const color = calendarColor(event.calendarName ?? "");

  return (
    <div style={styles.card}>
      <span style={{ ...styles.dot, background: color }} />
      <div style={styles.time}>{time}</div>
      <div style={styles.info}>
        {event.externalUrl ? (
          <button
            type="button"
            style={styles.summaryLink}
            onClick={() => {
              if (event.externalUrl) openUrl(event.externalUrl);
            }}
          >
            {event.summary || t.noTitle}
          </button>
        ) : (
          <div style={styles.summary}>{event.summary || t.noTitle}</div>
        )}
        {meeting && (
          <button
            type="button"
            style={styles.badge}
            onClick={() => openUrl(meeting.url)}
          >
            {meeting.type}
          </button>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "12px 16px",
    borderBottom: "1px solid #eee",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    flexShrink: 0,
  },
  time: {
    fontSize: 14,
    fontWeight: 600,
    color: "#666",
    minWidth: 50,
  },
  info: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  summary: {
    fontSize: 14,
  },
  summaryLink: {
    fontSize: 14,
    background: "none",
    border: "none",
    padding: 0,
    color: "#1a73e8",
    cursor: "pointer",
    textAlign: "left" as const,
  },
  badge: {
    fontSize: 11,
    padding: "2px 6px",
    borderRadius: 4,
    background: "#e8f0fe",
    color: "#1a73e8",
    fontWeight: 600,
    border: "none",
    cursor: "pointer",
  },
};
