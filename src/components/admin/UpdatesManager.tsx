"use client";

import { useState } from "react";

type UpdateType = "FEATURE" | "FIX" | "BUG";

type Update = {
  id: string;
  content: string;
  type: UpdateType;
  createdAt: string;
  author: { username: string };
  likeCount: number;
};

const typeOptions: { value: UpdateType; label: string; color: string; bg: string }[] = [
  { value: "FEATURE", label: "novidade", color: "#008c9a", bg: "rgba(49,213,222,.15)" },
  { value: "FIX",     label: "correção", color: "#16a34a", bg: "rgba(22,163,74,.12)" },
  { value: "BUG",     label: "bug",      color: "#dc2626", bg: "rgba(220,38,38,.12)" },
];

export default function UpdatesManager({ initialUpdates }: { initialUpdates: Update[] }) {
  const [updates, setUpdates] = useState<Update[]>(initialUpdates);
  const [content, setContent] = useState("");
  const [type, setType] = useState<UpdateType>("FEATURE");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), type }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Erro ao publicar"); return; }

      setUpdates([data, ...updates]);
      setContent("");
    } catch {
      setError("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover esta atualização?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/updates/${id}`, { method: "DELETE" });
      if (res.ok) setUpdates(updates.filter((u) => u.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Formulário */}
      <div className="card p-5 flex flex-col gap-4">
        <h2 className="text-sm font-black m-0" style={{ color: "var(--color-text)" }}>
          nova atualização
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* Tipo */}
          <div className="flex gap-2">
            {typeOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setType(opt.value)}
                className="px-3 py-1.5 rounded-full text-xs font-black transition-all"
                style={{
                  background: type === opt.value ? opt.bg : "var(--color-border)",
                  color: type === opt.value ? opt.color : "var(--color-text-muted)",
                  border: `1.5px solid ${type === opt.value ? opt.color : "transparent"}`,
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <textarea
            className="input-base resize-none"
            rows={4}
            maxLength={1000}
            placeholder="Descreva a atualização..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
          />

          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              {content.length}/1000
            </span>
            <button type="submit" className="btn-primary" disabled={loading || !content.trim()}>
              {loading ? "publicando..." : "publicar"}
            </button>
          </div>

          {error && (
            <p className="text-sm font-bold" style={{ color: "#b91c1c" }}>{error}</p>
          )}
        </form>
      </div>

      {/* Lista */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-black" style={{ color: "var(--color-text-muted)" }}>
          publicadas ({updates.length})
        </h2>

        {updates.length === 0 ? (
          <div className="card p-6 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
            nenhuma atualização publicada ainda.
          </div>
        ) : (
          updates.map((update) => {
            const meta = typeOptions.find((o) => o.value === update.type)!;
            return (
              <div key={update.id} className="card p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[10px] font-black px-2 py-0.5 rounded-full"
                      style={{ background: meta.bg, color: meta.color }}
                    >
                      {meta.label}
                    </span>
                    <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                      {new Date(update.createdAt).toLocaleDateString("pt-BR", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </span>
                    <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                      · {update.likeCount} {update.likeCount === 1 ? "like" : "likes"}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDelete(update.id)}
                    disabled={deletingId === update.id}
                    className="text-xs font-bold transition-opacity hover:opacity-60"
                    style={{ color: "#dc2626" }}
                  >
                    {deletingId === update.id ? "..." : "remover"}
                  </button>
                </div>
                <p className="text-sm leading-relaxed m-0 whitespace-pre-wrap" style={{ color: "var(--color-text)" }}>
                  {update.content}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
