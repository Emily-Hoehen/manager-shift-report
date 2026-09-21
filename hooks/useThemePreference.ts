"use client";

import { useEffect, useState } from "react";

export type ThemePreference = "light" | "dark";

const STORAGE_KEY = "manager-shift-report-theme";

/**
 * Shared light/dark preference for the Manager Shift Report feature (Shift Reports grid, Daily Report,
 * Shift Report) — one shared toggle across all three pages, persisted to localStorage so switching to
 * dark on one page keeps it dark on the next. Starts at "light" (matching the server-rendered markup)
 * and only reads the stored value after mount, same convention as this feature's other client-only state
 * (e.g. EndOfShiftReportPage's own `now`), so the SSR and first client render never disagree.
 */
export function useThemePreference(): [ThemePreference, (theme: ThemePreference) => void] {
  const [theme, setThemeState] = useState<ThemePreference>("light");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "light" || stored === "dark") setThemeState(stored);
    } catch {
      // Private browsing / blocked storage — falls back to the "light" default silently.
    }
  }, []);

  function setTheme(next: ThemePreference) {
    setThemeState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Nothing to persist to — the in-memory state above still updates for this page view.
    }
  }

  return [theme, setTheme];
}
