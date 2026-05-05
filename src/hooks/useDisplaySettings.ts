import { useEffect, useState } from "react";
import { load } from "@tauri-apps/plugin-store";

export type DisplayRange = 1 | 2 | 3;

const DEFAULT_RANGE: DisplayRange = 1;
const DEFAULT_WEEKDAYS_ONLY = false;

export function useDisplaySettings() {
  const [range, setRangeState] = useState<DisplayRange>(DEFAULT_RANGE);
  const [weekdaysOnly, setWeekdaysOnlyState] = useState(DEFAULT_WEEKDAYS_ONLY);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    load("settings.json")
      .then(async (store) => {
        const r = (await store.get("displayRange")) as number | undefined;
        if (r === 1 || r === 2 || r === 3) setRangeState(r);
        const w = (await store.get("weekdaysOnly")) as boolean | undefined;
        if (typeof w === "boolean") setWeekdaysOnlyState(w);
      })
      .finally(() => setLoaded(true));
  }, []);

  const setRange = async (value: DisplayRange) => {
    setRangeState(value);
    const store = await load("settings.json");
    await store.set("displayRange", value);
    await store.save();
  };

  const setWeekdaysOnly = async (value: boolean) => {
    setWeekdaysOnlyState(value);
    const store = await load("settings.json");
    await store.set("weekdaysOnly", value);
    await store.save();
  };

  return { range, weekdaysOnly, loaded, setRange, setWeekdaysOnly };
}
