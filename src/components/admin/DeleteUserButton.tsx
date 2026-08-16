"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteUserButton({ userId, username }: { userId: string; username: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    const first = confirm(
      `⚠️ EXCLUSÃO PERMANENTE\n\n@${username} terá todos os dados apagados da rede: posts, amizades, depos, comunidades e tudo mais.\n\nEssa ação é IRREVERSÍVEL.\n\nContinuar?`
    );
    if (!first) return;

    const second = confirm(
      `Última confirmação: excluir permanentemente @${username}?`
    );
    if (!second) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Erro ao excluir usuário.");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-xs px-2.5 py-1 rounded-full"
      style={{
        background: "transparent",
        color: "#7f1d1d",
        border: "1px solid #fca5a5",
      }}
    >
      {loading ? "…" : "excluir"}
    </button>
  );
}
