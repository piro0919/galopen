import { useState } from "react";
import { t } from "../i18n";

export function PermissionRequest({
  onRequestPermission,
  status,
}: {
  onRequestPermission: () => void;
  status: string;
}) {
  const [btnHovered, setBtnHovered] = useState(false);

  return (
    <div style={styles.container}>
      <img src="/icon.png" alt={t.appName} width={64} height={64} style={{ borderRadius: 14 }} />
      <h1 style={styles.title}>{t.appName}</h1>
      <p style={styles.subtitle}>{t.subtitle}</p>

      {(status === "not_determined" || status === "denied") && (
        <>
          <p style={styles.description}>{t.permissionDesc}</p>
          <button
            type="button"
            onClick={onRequestPermission}
            onMouseEnter={() => setBtnHovered(true)}
            onMouseLeave={() => setBtnHovered(false)}
            style={{
              ...styles.button,
              ...(btnHovered ? styles.buttonHover : {}),
            }}
          >
            {t.openSettings}
          </button>
        </>
      )}

      {status === "restricted" && (
        <p style={styles.description}>{t.restrictedMsg}</p>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    padding: 24,
    background: "var(--bg-main)",
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: "var(--text-primary)",
    letterSpacing: "-0.3px",
    margin: "12px 0 0",
  },
  subtitle: {
    fontSize: 13,
    color: "var(--text-secondary)",
    marginBottom: 28,
  },
  description: {
    fontSize: 13,
    color: "var(--text-secondary)",
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 1.6,
    marginBottom: 24,
  },
  button: {
    padding: "10px 24px",
    borderRadius: 8,
    border: "none",
    background: "var(--primary)",
    color: "#fff",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    transition: "background 0.15s ease",
  },
  buttonHover: {
    background: "var(--primary-hover)",
  },
};
