"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ToggleUserButton({ userId, isActive }: { userId: string; isActive: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (!confirm(`${isActive ? "Desativar" : "Reativar"} este usuário?`)) return;
    setLoading(true);
    try {
      await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="text-xs px-2.5 py-1 rounded-full"
      style={{
        background: "transparent",
        color: isActive ? "#b91c1c" : "var(--color-tece-600)",
        border: `1px solid ${isActive ? "#fecaca" : "var(--color-tece-200)"}`,
      }}
    >
      {loading ? "…" : isActive ? "desativar" : "reativar"}
    </button>
  );
}
