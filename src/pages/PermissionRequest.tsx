import { t } from "../i18n";

export function PermissionRequest({
  onRequestPermission,
  status,
}: {
  onRequestPermission: () => void;
  status: string;
}) {
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>{t.appName}</h1>
      <p style={styles.subtitle}>{t.subtitle}</p>

      {(status === "not_determined" || status === "denied") && (
        <>
          <p style={styles.description}>{t.permissionDesc}</p>
          <button onClick={onRequestPermission} style={styles.button}>
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
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    margin: 0,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 32,
  },
  description: {
    fontSize: 14,
    color: "#444",
    textAlign: "center",
    maxWidth: 300,
    lineHeight: 1.6,
    marginBottom: 24,
  },
  button: {
    padding: "10px 24px",
    borderRadius: 6,
    border: "none",
    background: "#1a73e8",
    color: "#fff",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
};
