import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";
import { Bell, Clock, Globe, LogOut, Power } from "lucide-react";
import { t } from "../i18n";
import { load } from "@tauri-apps/plugin-store";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";
import { getInstalledApps, type AppOption } from "../lib/tauri";

const MINUTE_OPTIONS = [1, 2, 3, 5, 10];
const TRAY_COUNTDOWN_OPTIONS = [15, 30, 60, 0]; // 0 = always
const MEETING_SERVICES = [
  { key: "googleMeet", label: "Google Meet" },
  { key: "zoom", label: "Zoom" },
  { key: "teams", label: "Teams" },
  { key: "webex", label: "Webex" },
] as const;

export function Settings() {
  const [minutesBefore, setMinutesBefore] = useState(1);
  const [trayCountdown, setTrayCountdown] = useState(30);
  const [autostart, setAutostart] = useState(false);
  const [quitHovered, setQuitHovered] = useState(false);
  const [version, setVersion] = useState("");
  const [installedApps, setInstalledApps] = useState<AppOption[]>([]);
  const [openWith, setOpenWith] = useState<Record<string, string>>({});

  useEffect(() => {
    load("settings.json").then(async (store) => {
      const val = (await store.get("minutesBefore")) as number | undefined;
      if (val != null) setMinutesBefore(val);
      const tray = (await store.get("trayCountdownMinutes")) as number | undefined;
      if (tray != null) setTrayCountdown(tray);
      const ow = (await store.get("openWith")) as Record<string, string> | undefined;
      if (ow) setOpenWith(ow);
    });
    isEnabled().then(setAutostart).catch(() => {});
    getVersion().then(setVersion).catch(() => {});
    getInstalledApps().then(setInstalledApps).catch(() => {});
  }, []);

  const handleChange = async (value: number) => {
    setMinutesBefore(value);
    const store = await load("settings.json");
    await store.set("minutesBefore", value);
    await store.save();
  };

  const handleTrayCountdown = async (value: number) => {
    setTrayCountdown(value);
    const store = await load("settings.json");
    await store.set("trayCountdownMinutes", value);
    await store.save();
  };

  const handleOpenWith = async (service: string, appId: string) => {
    const next = { ...openWith, [service]: appId };
    setOpenWith(next);
    const store = await load("settings.json");
    await store.set("openWith", next);
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
    } catch (e) {
      console.error("[galopen] autostart error:", e);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.row}>
        <div style={styles.labelRow}>
          <Bell size={14} strokeWidth={1.75} color="var(--text-secondary)" />
          <span style={styles.label}>{t.openBefore}</span>
        </div>
        <select
          value={minutesBefore}
          onChange={(e) => handleChange(Number(e.target.value))}
          style={styles.select}
        >
          {MINUTE_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {m}{t.minutesBefore}
            </option>
          ))}
        </select>
      </div>
      <div style={{ ...styles.row, marginTop: 12 }}>
        <div style={styles.labelRow}>
          <Clock size={14} strokeWidth={1.75} color="var(--text-secondary)" />
          <span style={styles.label}>{t.trayCountdown}</span>
        </div>
        <select
          value={trayCountdown}
          onChange={(e) => handleTrayCountdown(Number(e.target.value))}
          style={styles.select}
        >
          {TRAY_COUNTDOWN_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {m === 0 ? t.trayAlways : `${m}${t.trayMinutes}`}
            </option>
          ))}
        </select>
      </div>
      {installedApps.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={styles.labelRow}>
            <Globe size={14} strokeWidth={1.75} color="var(--text-secondary)" />
            <span style={styles.label}>{t.openWithLabel}</span>
          </div>
          {MEETING_SERVICES.map(({ key, label }) => {
            const availableApps = installedApps.filter(
              (app) => app.serviceHint === null || app.serviceHint === key
            );
            return (
              <div key={key} style={{ ...styles.row, marginTop: 8, paddingLeft: 20 }}>
                <span style={styles.serviceLabel}>{label}</span>
                <select
                  value={openWith[key] ?? "default"}
                  onChange={(e) => handleOpenWith(key, e.target.value)}
                  style={{ ...styles.select, width: 160 }}
                >
                  <option value="default">{t.openWithDefault}</option>
                  {availableApps.map((app) => (
                    <option key={app.id} value={app.id}>
                      {app.serviceHint ? `${app.name} (${t.nativeApp})` : app.name}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      )}
      <div style={{ ...styles.row, marginTop: 12 }}>
        <div style={styles.labelRow}>
          <Power size={14} strokeWidth={1.75} color="var(--text-secondary)" />
          <span style={styles.label}>{t.startAtLogin}</span>
        </div>
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
      <div style={{ ...styles.row, marginTop: 16 }}>
        <button
          type="button"
          onClick={() => invoke("quit_app")}
          onMouseEnter={() => setQuitHovered(true)}
          onMouseLeave={() => setQuitHovered(false)}
          style={{
            ...styles.quitBtn,
            ...(quitHovered ? styles.quitBtnHover : {}),
          }}
        >
          <LogOut size={14} strokeWidth={1.75} />
          {t.quitApp}
        </button>
      </div>
      {version && (
        <div style={styles.version}>v{version}</div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: "12px 16px",
    borderBottom: "1px solid var(--divider)",
  },
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  labelRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  label: {
    fontSize: 13,
    fontWeight: 500,
    color: "var(--text-primary)",
  },
  serviceLabel: {
    fontSize: 12,
    color: "var(--text-secondary)",
    minWidth: 80,
  },
  select: {
    fontSize: 13,
    padding: "4px 8px",
    borderRadius: 6,
    border: "1px solid var(--border-color)",
    background: "var(--bg-card)",
    color: "var(--text-primary)",
    cursor: "pointer",
    outline: "none",
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
    background: "var(--toggle-on-bg)",
  },
  toggleOff: {
    background: "var(--toggle-off-bg)",
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    background: "var(--toggle-knob)",
    boxShadow: "0 1px 3px var(--toggle-knob-shadow)",
    transition: "transform 0.2s",
  },
  knobOn: {
    transform: "translateX(20px)",
  },
  knobOff: {
    transform: "translateX(0)",
  },
  quitBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    fontSize: 13,
    fontWeight: 500,
    padding: "8px 0",
    borderRadius: 8,
    border: "1px solid var(--border-color)",
    background: "var(--bg-card)",
    cursor: "pointer",
    color: "var(--quit-text)",
    transition: "all 0.15s ease",
  },
  quitBtnHover: {
    background: "var(--quit-hover-bg)",
    borderColor: "var(--quit-hover-border)",
  },
  version: {
    marginTop: 12,
    fontSize: 11,
    color: "var(--text-tertiary)",
    textAlign: "center" as const,
  },
};
