import { Loader2 } from "lucide-react";
import { usePermission } from "./hooks/usePermission";
import { Home } from "./pages/Home";
import { PermissionRequest } from "./pages/PermissionRequest";

function App() {
  const { status, requestPermission } = usePermission();

  if (status === "loading") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          gap: 10,
          background: "var(--bg-main)",
        }}
      >
        <img src="/icon.png" alt="" width={48} height={48} style={{ borderRadius: 10 }} />
        <Loader2
          size={20}
          strokeWidth={1.75}
          color="var(--text-tertiary)"
          className="spin"
        />
      </div>
    );
  }

  if (status !== "granted") {
    return (
      <PermissionRequest
        onRequestPermission={requestPermission}
        status={status}
      />
    );
  }

  return <Home />;
}

export default App;
