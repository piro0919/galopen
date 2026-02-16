import { usePermission } from "./hooks/usePermission";
import { t } from "./i18n";
import { Home } from "./pages/Home";
import { PermissionRequest } from "./pages/PermissionRequest";

function App() {
  const { status, requestPermission } = usePermission();

  if (status === "loading") {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <p>{t.loading}</p>
      </div>
    );
  }

  if (status !== "granted") {
    return <PermissionRequest onRequestPermission={requestPermission} status={status} />;
  }

  return <Home />;
}

export default App;
