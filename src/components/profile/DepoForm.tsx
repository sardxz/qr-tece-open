"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  recipientUsername: string;
};

export default function DepoForm({ recipientUsername }: Props) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const MAX = 500;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/depos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), recipientUsername }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Erro ao enviar depo");
        return;
      }

      setSent(true);
      router.refresh();
    } catch {
      setError("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div
        className="text-sm px-3 py-2 rounded-lg text-center"
        style={{ background: "var(--color-tece-50)", color: "var(--color-tece-700)", border: "1px solid var(--color-tece-200)" }}
      >
        Depo enviado! Aguardando aprovação. ✦
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <p className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
        escrever depo
      </p>
      <textarea
        className="input-base resize-none text-sm"
        placeholder={`O que você quer dizer para ${recipientUsername}?`}
        rows={3}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxLength={MAX}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          {content.length}/{MAX}
        </span>
        <button
          type="submit"
          className="btn-primary text-xs px-3 py-1.5"
          disabled={loading || content.trim().length < 10}
        >
          {loading ? "enviando…" : "enviar depo"}
        </button>
      </div>
      {error && (
        <p className="text-xs" style={{ color: "#b91c1c" }}>
          {error}
        </p>
      )}
    </form>
  );
}
