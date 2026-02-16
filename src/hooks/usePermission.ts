import { useEffect, useState } from "react";
import { checkCalendarPermission, requestCalendarPermission } from "../lib/tauri";

type PermissionStatus = "loading" | "granted" | "denied" | "not_determined" | "restricted";

export function usePermission() {
  const [status, setStatus] = useState<PermissionStatus>("loading");

  useEffect(() => {
    checkCalendarPermission().then((s) => {
      setStatus(s as PermissionStatus);
    });
  }, []);

  const requestPermission = async () => {
    const granted = await requestCalendarPermission();
    setStatus(granted ? "granted" : "denied");
  };

  return { status, requestPermission };
}
