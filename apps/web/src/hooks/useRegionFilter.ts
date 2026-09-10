import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "izora-region";
const CHANGE_EVENT = "izora-region-change";

export function useRegionFilter() {
  const [region, setRegionState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) ?? "";
    } catch {
      return "";
    }
  });

  useEffect(() => {
    const onChange = () => {
      try {
        setRegionState(localStorage.getItem(STORAGE_KEY) ?? "");
      } catch {
        setRegionState("");
      }
    };
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CHANGE_EVENT, onChange);
  }, []);

  const setRegion = useCallback((value: string) => {
    try {
      if (value) localStorage.setItem(STORAGE_KEY, value);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setRegionState(value);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { region, setRegion };
}

export function listAvailableRegions(
  titles: { region?: string }[],
): string[] {
  const set = new Set<string>();
  for (const t of titles) {
    if (t.region?.trim()) set.add(t.region.trim());
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}
