"use client";

import { useTheme } from "./ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
      className="flex items-center gap-3 rounded-xl px-4 py-2.5 font-bold text-sm transition-all"
      style={{
        background: isDark ? "rgba(49,213,222,.15)" : "rgba(23,32,51,.06)",
        color: isDark ? "var(--color-tece-500)" : "var(--color-text)",
        border: `1.5px solid ${isDark ? "var(--color-tece-300)" : "var(--color-border)"}`,
      }}
    >
      <span className="text-lg leading-none">{isDark ? "☀️" : "🌙"}</span>
      <span>{isDark ? "modo claro" : "modo escuro"}</span>
    </button>
  );
}
