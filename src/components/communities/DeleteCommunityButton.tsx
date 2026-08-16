"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  slug: string;
};

export default function DeleteCommunityButton({ slug }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    const confirmed = window.confirm(
      "Excluir esta comunidade? Posts e comentários dela também serão removidos."
    );
    if (!confirmed) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/communities/${slug}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Erro ao excluir comunidade");
        return;
      }

      router.push("/comunidades");
      router.refresh();
    } catch {
      setError("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleDelete}
        disabled={loading}
        className="rounded-md border px-3 py-2 text-sm font-semibold transition-colors"
        style={{
          borderColor: "#fecaca",
          color: "#b91c1c",
          background: loading ? "#fee2e2" : "#fff",
        }}
      >
        {loading ? "excluindo..." : "excluir"}
      </button>
      {error && (
        <p className="max-w-40 text-right text-xs" style={{ color: "#b91c1c" }}>
          {error}
        </p>
      )}
    </div>
  );
}
