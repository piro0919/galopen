import { useEffect, useState } from "react";
import { forceSync, getTodaysEvents } from "../lib/tauri";
import type { CalendarEvent } from "../types";

export function useEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial fetch
    forceSync()
      .then(setEvents)
      .catch((e) => console.error("[galopen] forceSync error:", e))
      .finally(() => setLoading(false));

    // Re-read cached events every 60s
    const interval = setInterval(async () => {
      try {
        const data = await getTodaysEvents();
        setEvents(data);
      } catch {
        // ignore
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  return { events, loading };
}
