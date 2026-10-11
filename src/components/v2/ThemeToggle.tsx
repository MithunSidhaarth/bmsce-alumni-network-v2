"use client";

import { useEffect, useState } from "react";
import Icon from "./Icon";

/**
 * Day or night. The choice is kept in a cookie so the server sends the right
 * theme with the page and nothing flashes on load.
 */
export default function ThemeToggle({ className = "", label = false }: { className?: string; label?: boolean }) {
  const [night, setNight] = useState(false);
  useEffect(() => setNight(document.documentElement.dataset.theme === "night"), []);

  const flip = () => {
    const next = !night;
    setNight(next);
    if (next) document.documentElement.dataset.theme = "night";
    else delete document.documentElement.dataset.theme;
    document.cookie = `theme=${next ? "night" : "day"}; path=/; max-age=31536000; samesite=lax`;
  };

  return (
    <button type="button" onClick={flip} aria-pressed={night} aria-label={night ? "Switch to day" : "Switch to night"} title={night ? "Day" : "Night"} className={className}>
      <Icon name={night ? "sun" : "moon"} />
      {label && <span>{night ? "Day" : "Night"}</span>}
    </button>
  );
}
