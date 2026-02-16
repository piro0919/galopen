import { useEffect, useRef, useState } from "react";
import {
  checkCalendarPermission,
  openCalendarSettings,
  requestCalendarPermission,
} from "../lib/tauri";

type PermissionStatus =
  | "loading"
  | "granted"
  | "denied"
  | "not_determined"
  | "restricted";

export function usePermission() {
  const [status, setStatus] = useState<PermissionStatus>("loading");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    checkCalendarPermission()
      .then((s) => setStatus(s as PermissionStatus))
      .catch(() => setStatus("not_determined"));
  }, []);

  // Poll for permission changes when not granted
  useEffect(() => {
    if (status === "granted" || status === "loading") {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    pollingRef.current = setInterval(async () => {
      try {
        const s = await checkCalendarPermission();
        if (s === "granted") {
          setStatus("granted");
        }
      } catch {
        // ignore
      }
    }, 2000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [status]);

  const requestPermission = async () => {
    // First call the API to register with TCC (may show system dialog)
    try {
      const granted = await requestCalendarPermission();
      if (granted) {
        setStatus("granted");
        return;
      }
    } catch {
      // ignore - fall through to open Settings
    }
    // If not granted, open System Settings for manual toggle
    await openCalendarSettings();
  };

  return { status, requestPermission };
}
