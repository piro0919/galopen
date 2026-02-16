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
    background: "#F5F5F7",
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: "#1D1D1F",
    letterSpacing: "-0.3px",
    margin: "12px 0 0",
  },
  subtitle: {
    fontSize: 13,
    color: "#6E6E73",
    marginBottom: 28,
  },
  description: {
    fontSize: 13,
    color: "#6E6E73",
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 1.6,
    marginBottom: 24,
  },
  button: {
    padding: "10px 24px",
    borderRadius: 8,
    border: "none",
    background: "#007AFF",
    color: "#fff",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    transition: "background 0.15s ease",
  },
  buttonHover: {
    background: "#0062CC",
  },
};
