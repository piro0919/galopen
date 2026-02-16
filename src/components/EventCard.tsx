import { openUrl } from "@tauri-apps/plugin-opener";
import { Check, Copy, ExternalLink, Video } from "lucide-react";
import { useEffect, useState } from "react";
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

function formatTimeRange(event: CalendarEvent): string {
  const startDt = event.start.dateTime;
  if (!startDt) return t.allDay;
  const fmt = (dt: string) =>
    new Date(dt).toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });
  const endDt = event.end.dateTime;
  return endDt ? `${fmt(startDt)}-${fmt(endDt)}` : fmt(startDt);
}

function getMinutesUntil(event: CalendarEvent): number | null {
  const dt = event.start.dateTime;
  if (!dt) return null;
  const diff = new Date(dt).getTime() - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / 60000);
}

export function getMeetingInfo(
  event: CalendarEvent,
): { type: string; url: string } | null {
  if (event.url) {
    for (const [re, name] of SERVICES) {
      if (re.test(event.url)) return { type: name, url: event.url };
    }
  }

  const text = `${event.location ?? ""} ${event.description ?? ""}`;
  const match = text.match(URL_PATTERN);
  if (match) {
    for (const [re, name] of SERVICES) {
      if (re.test(match[0])) return { type: name, url: match[0] };
    }
  }

  return null;
}

export function EventCard({
  event,
  isNext,
}: {
  event: CalendarEvent;
  isNext?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const [badgeHovered, setBadgeHovered] = useState(false);
  const [copied, setCopied] = useState(false);
  const [minutesLeft, setMinutesLeft] = useState<number | null>(() =>
    isNext ? getMinutesUntil(event) : null,
  );

  const time = formatTimeRange(event);
  const meeting = getMeetingInfo(event);
  const color = calendarColor(event.calendarName ?? "");

  useEffect(() => {
    if (!isNext || !event.start.dateTime) return;
    const tick = () => setMinutesLeft(getMinutesUntil(event));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [isNext, event]);

  const handleCopy = async () => {
    if (!meeting) return;
    await navigator.clipboard.writeText(meeting.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const countdownText =
    isNext && minutesLeft != null
      ? minutesLeft > 0
        ? `${t.countdownPrefix}${minutesLeft}${t.countdownSuffix}`
        : t.now
      : null;

  const countdownStyle =
    minutesLeft != null && minutesLeft <= 1
      ? styles.countdownUrgent
      : minutesLeft != null && minutesLeft <= 5
        ? styles.countdownSoon
        : styles.countdownNormal;

  return (
    <article
      style={{
        ...styles.card,
        ...(hovered ? styles.cardHover : {}),
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
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
            <ExternalLink
              size={11}
              strokeWidth={1.75}
              style={{ marginLeft: 4, verticalAlign: "middle", opacity: 0.6 }}
            />
          </button>
        ) : (
          <div style={styles.summary}>{event.summary || t.noTitle}</div>
        )}
        {countdownText && (
          <span style={{ ...styles.countdown, ...countdownStyle }}>
            {countdownText}
          </span>
        )}
        {meeting && (
          <button
            type="button"
            style={{
              ...styles.badge,
              ...(badgeHovered ? styles.badgeHover : {}),
            }}
            onClick={() => openUrl(meeting.url)}
            onMouseEnter={() => setBadgeHovered(true)}
            onMouseLeave={() => setBadgeHovered(false)}
          >
            <Video size={12} strokeWidth={1.75} />
            {meeting.type}
          </button>
        )}
        {meeting && (
          <button
            type="button"
            onClick={handleCopy}
            title={copied ? t.copied : t.copyUrl}
            style={{
              ...styles.copyBtn,
              ...(copied ? styles.copyBtnDone : {}),
            }}
          >
            {copied ? (
              <Check size={12} strokeWidth={2} />
            ) : (
              <Copy size={12} strokeWidth={1.75} />
            )}
          </button>
        )}
      </div>
    </article>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 12px",
    background: "#fff",
    borderRadius: 10,
    boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
    transition: "all 0.15s ease",
  },
  cardHover: {
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    transform: "translateY(-1px)",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    flexShrink: 0,
    boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.1)",
  },
  time: {
    fontSize: 12,
    fontWeight: 500,
    color: "#6E6E73",
    minWidth: 90,
    fontVariantNumeric: "tabular-nums",
  },
  info: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  summary: {
    fontSize: 13,
    fontWeight: 500,
    color: "#1D1D1F",
    lineHeight: 1.3,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  summaryLink: {
    fontSize: 13,
    fontWeight: 500,
    background: "none",
    border: "none",
    padding: 0,
    color: "#007AFF",
    cursor: "pointer",
    textAlign: "left" as const,
    lineHeight: 1.3,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  countdown: {
    display: "inline-flex",
    alignItems: "center",
    fontSize: 10,
    fontWeight: 600,
    padding: "2px 6px",
    borderRadius: 8,
    flexShrink: 0,
    whiteSpace: "nowrap",
  },
  countdownNormal: {
    background: "#E8F5E9",
    color: "#2E7D32",
  },
  countdownSoon: {
    background: "#FFF3E0",
    color: "#E65100",
  },
  countdownUrgent: {
    background: "#FFE5E5",
    color: "#FF3B30",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 3,
    fontSize: 11,
    fontWeight: 500,
    padding: "3px 8px",
    borderRadius: 12,
    background: "#E5F1FF",
    color: "#007AFF",
    border: "none",
    cursor: "pointer",
    flexShrink: 0,
    transition: "background 0.15s ease",
  },
  badgeHover: {
    background: "#CCE3FF",
  },
  copyBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 24,
    height: 24,
    borderRadius: 6,
    border: "none",
    background: "none",
    cursor: "pointer",
    color: "#AEAEB2",
    flexShrink: 0,
    transition: "all 0.15s ease",
  },
  copyBtnDone: {
    color: "#34A853",
  },
};
