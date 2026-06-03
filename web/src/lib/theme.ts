import { useCallback, useEffect, useState } from "react";

// Manual light/dark theme. Default is light; the chosen value is persisted to
// localStorage and applied via [data-theme] on <html>. A no-flash bootstrap in
// index.html applies the saved value before first paint.

export type Theme = "light" | "dark";

const STORAGE_KEY = "gmp.theme";

export function getTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.getAttribute("data-theme") === "dark"
    ? "dark"
    : "light";
}

export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  if (theme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
}

// React hook: current theme + a toggle. Syncs to the DOM attribute.
export function useTheme(): { theme: Theme; toggle: () => void } {
  const [theme, setTheme] = useState<Theme>(getTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  return { theme, toggle };
}
