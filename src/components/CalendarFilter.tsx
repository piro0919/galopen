import { t } from "../i18n";
import type { CalendarInfo } from "../types";

// Generate a stable color from calendar name
function calendarColor(name: string): string {
  const colors = [
    "#4285f4", "#ea4335", "#34a853", "#fbbc04",
    "#ff6d01", "#46bdc6", "#7baaf7", "#f07b72",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function CalendarFilter({
  calendars,
  enabledIds,
  onToggle,
}: {
  calendars: CalendarInfo[];
  enabledIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  if (calendars.length <= 1) return null;

  // Group by source
  const grouped = new Map<string, CalendarInfo[]>();
  for (const cal of calendars) {
    const key = cal.sourceName || t.other;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(cal);
  }

  return (
    <div style={styles.container}>
      {[...grouped.entries()].map(([source, cals]) => (
        <div key={source}>
          <div style={styles.sourceName}>{source}</div>
          {cals.map((cal) => {
            const enabled = enabledIds.has(cal.id);
            return (
              <button
                type="button"
                key={cal.id}
                onClick={() => onToggle(cal.id)}
                style={{
                  ...styles.item,
                  opacity: enabled ? 1 : 0.4,
                }}
              >
                <span
                  style={{
                    ...styles.dot,
                    background: calendarColor(cal.title),
                  }}
                />
                <span style={styles.calName}>{cal.title}</span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// Re-export for EventCard usage
export { calendarColor };

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: "8px 16px",
    borderBottom: "1px solid #ddd",
  },
  sourceName: {
    fontSize: 11,
    color: "#999",
    fontWeight: 600,
    textTransform: "uppercase",
    padding: "4px 0",
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 8px",
    border: "none",
    background: "none",
    cursor: "pointer",
    width: "100%",
    textAlign: "left",
    borderRadius: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    flexShrink: 0,
  },
  calName: {
    fontSize: 13,
  },
};
