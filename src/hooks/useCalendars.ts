import { useCallback, useEffect, useState } from "react";
import { getCalendars } from "../lib/tauri";
import type { CalendarInfo } from "../types";

const STORAGE_KEY = "galopen-enabled-calendars";

export function useCalendars() {
  const [calendars, setCalendars] = useState<CalendarInfo[]>([]);
  const [enabledIds, setEnabledIds] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getCalendars().then((cals) => {
      setCalendars(cals);

      // Load saved selection from localStorage
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const ids: string[] = JSON.parse(saved);
          // Only keep IDs that still exist
          const valid = new Set(ids.filter((id) => cals.some((c) => c.id === id)));
          setEnabledIds(valid.size > 0 ? valid : new Set(cals.map((c) => c.id)));
        } catch {
          setEnabledIds(new Set(cals.map((c) => c.id)));
        }
      } else {
        // Default: all enabled
        setEnabledIds(new Set(cals.map((c) => c.id)));
      }
      setLoaded(true);
    });
  }, []);

  const toggleCalendar = useCallback(
    (id: string) => {
      setEnabledIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          // Don't allow disabling all calendars
          if (next.size > 1) next.delete(id);
        } else {
          next.add(id);
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
        return next;
      });
    },
    [],
  );

  return { calendars, enabledIds, loaded, toggleCalendar };
}
