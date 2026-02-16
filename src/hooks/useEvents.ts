import { useCallback, useEffect, useState } from "react";
import { forceSync, getTodaysEvents } from "../lib/tauri";
import type { CalendarEvent } from "../types";

export function useEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await forceSync();
      setEvents(data);
    } catch {
      // Silently fail - scheduler will retry
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(async () => {
      const data = await getTodaysEvents();
      setEvents(data);
    }, 60_000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { events, loading, refresh };
}
