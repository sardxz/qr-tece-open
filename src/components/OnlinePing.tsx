"use client";

import { useEffect } from "react";

export default function OnlinePing() {
  useEffect(() => {
    async function ping() {
      await fetch("/api/auth/ping", { method: "POST" }).catch(() => {});
    }
    ping();
    const id = setInterval(ping, 2 * 60 * 1000); // a cada 2 minutos
    return () => clearInterval(id);
  }, []);

  return null;
}
