import { t } from "../i18n";
import type { CalendarInfo } from "../types";

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

export { calendarColor };

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: "8px 16px 12px",
    borderBottom: "1px solid var(--divider)",
  },
  sourceName: {
    fontSize: 11,
    fontWeight: 600,
    color: "var(--text-tertiary)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    padding: "6px 0 2px",
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 8px",
    border: "none",
    background: "none",
    cursor: "pointer",
    width: "100%",
    textAlign: "left",
    borderRadius: 6,
    transition: "background 0.15s ease",
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    flexShrink: 0,
    boxShadow: "var(--dot-inset-shadow)",
  },
  calName: {
    fontSize: 13,
    color: "var(--text-primary)",
  },
};
