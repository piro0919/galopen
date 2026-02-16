import { useEffect, useState } from "react";
import { t } from "../i18n";
import { load } from "@tauri-apps/plugin-store";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";

const MINUTE_OPTIONS = [1, 2, 3, 5, 10];

export function Settings() {
  const [minutesBefore, setMinutesBefore] = useState(1);
  const [autostart, setAutostart] = useState(false);

  useEffect(() => {
    load("settings.json").then(async (store) => {
      const val = (await store.get("minutesBefore")) as number | undefined;
      if (val != null) setMinutesBefore(val);
    });
    isEnabled().then(setAutostart).catch(() => {});
  }, []);

  const handleChange = async (value: number) => {
    setMinutesBefore(value);
    const store = await load("settings.json");
    await store.set("minutesBefore", value);
    await store.save();
  };

  const handleAutostart = async () => {
    try {
      if (autostart) {
        await disable();
        setAutostart(false);
      } else {
        await enable();
        setAutostart(true);
      }
    } catch {
      // autostart may fail in dev mode
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.row}>
        <span style={styles.label}>{t.openBefore}</span>
        <div style={styles.options}>
          {MINUTE_OPTIONS.map((m) => (
            <button
              type="button"
              key={m}
              onClick={() => handleChange(m)}
              style={{
                ...styles.option,
                ...(m === minutesBefore ? styles.optionActive : {}),
              }}
            >
              {m}{t.minutesBefore}
            </button>
          ))}
        </div>
      </div>
      <div style={{ ...styles.row, marginTop: 10 }}>
        <span style={styles.label}>{t.startAtLogin}</span>
        <button
          type="button"
          onClick={handleAutostart}
          style={{
            ...styles.toggle,
            ...(autostart ? styles.toggleOn : styles.toggleOff),
          }}
        >
          <div
            style={{
              ...styles.toggleKnob,
              ...(autostart ? styles.knobOn : styles.knobOff),
            }}
          />
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: "12px 16px",
    borderBottom: "1px solid #ddd",
  },
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    flexShrink: 0,
  },
  options: {
    display: "flex",
    gap: 4,
  },
  option: {
    fontSize: 12,
    padding: "4px 8px",
    borderRadius: 4,
    border: "1px solid #ccc",
    background: "#fff",
    cursor: "pointer",
  },
  optionActive: {
    background: "#1a73e8",
    color: "#fff",
    borderColor: "#1a73e8",
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    border: "none",
    cursor: "pointer",
    position: "relative" as const,
    padding: 2,
    transition: "background 0.2s",
  },
  toggleOn: {
    background: "#1a73e8",
  },
  toggleOff: {
    background: "#ccc",
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    background: "#fff",
    transition: "transform 0.2s",
  },
  knobOn: {
    transform: "translateX(20px)",
  },
  knobOff: {
    transform: "translateX(0)",
  },
};
