"use client";

import { useState, useEffect, useRef } from "react";

export function MetricTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [open]);

  return (
    <div
      ref={containerRef}
      className="relative inline-flex items-center"
      style={{ marginLeft: "5px", verticalAlign: "middle" }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-center rounded-full"
        style={{
          width: "14px",
          height: "14px",
          fontSize: "9px",
          fontWeight: 900,
          lineHeight: 1,
          cursor: "help",
          background: "var(--color-border)",
          color: "var(--color-text-muted)",
          border: "none",
          flexShrink: 0,
          padding: 0,
        }}
        aria-label="explicação da métrica"
      >
        ?
      </button>

      <div
        style={{
          position: "absolute",
          bottom: "calc(100% + 8px)",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 50,
          background: "rgba(10,10,16,0.97)",
          border: "1px solid var(--color-border)",
          borderRadius: "8px",
          color: "#cbd5e1",
          padding: "10px 14px",
          maxWidth: "320px",
          minWidth: "180px",
          fontSize: "11px",
          lineHeight: "1.55",
          boxShadow: "0 8px 32px rgba(0,0,0,0.55)",
          whiteSpace: "normal",
          pointerEvents: open ? "auto" : "none",
          opacity: open ? 1 : 0,
          visibility: open ? "visible" : "hidden",
          transition: "opacity 150ms ease",
        }}
      >
        {text}
        <span
          style={{
            position: "absolute",
            bottom: "-5px",
            left: "50%",
            transform: "translateX(-50%) rotate(45deg)",
            width: "8px",
            height: "8px",
            background: "rgba(10,10,16,0.97)",
            borderRight: "1px solid var(--color-border)",
            borderBottom: "1px solid var(--color-border)",
          }}
        />
      </div>
    </div>
  );
}
