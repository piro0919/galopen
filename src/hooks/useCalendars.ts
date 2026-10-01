import { useCallback, useEffect, useState } from "react";
import { load } from "@tauri-apps/plugin-store";
import { getCalendars } from "../lib/tauri";
import type { CalendarInfo } from "../types";

// The scheduler reads the selection from settings.json, so auto-open follows the filter.
const STORE_KEY = "enabledCalendars";
// Where the selection lived before; migrated into the store once.
const LEGACY_STORAGE_KEY = "galopen-enabled-calendars";

async function saveSelection(ids: string[]) {
  const store = await load("settings.json");
  await store.set(STORE_KEY, ids);
  await store.save();
}

async function loadSelection(): Promise<string[] | null> {
  const store = await load("settings.json");
  const saved = await store.get<string[]>(STORE_KEY);
  if (Array.isArray(saved)) return saved;

  const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!legacy) return null;
  try {
    const ids: unknown = JSON.parse(legacy);
    if (!Array.isArray(ids)) return null;
    const valid = ids.filter((id): id is string => typeof id === "string");
    await saveSelection(valid);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return valid;
  } catch {
    return null;
  }
}

export function useCalendars() {
  const [calendars, setCalendars] = useState<CalendarInfo[]>([]);
  const [enabledIds, setEnabledIds] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([getCalendars(), loadSelection().catch(() => null)]).then(
      ([cals, saved]) => {
        setCalendars(cals);

        if (saved) {
          // Only keep IDs that still exist
          const valid = new Set(saved.filter((id) => cals.some((c) => c.id === id)));
          setEnabledIds(valid.size > 0 ? valid : new Set(cals.map((c) => c.id)));
        } else {
          // Default: all enabled
          setEnabledIds(new Set(cals.map((c) => c.id)));
        }
        setLoaded(true);
      },
    );
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
        saveSelection([...next]).catch((e) =>
          console.error("Failed to save calendar selection:", e),
        );
        return next;
      });
    },
    [],
  );

  return { calendars, enabledIds, loaded, toggleCalendar };
}
