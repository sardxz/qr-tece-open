"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GenerateInviteButton({ adminId }: { adminId: string }) {
  const router = useRouter();
  const [count, setCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [newCodes, setNewCodes] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/admin/invites")
      .then((r) => r.json())
      .then((d) => setRemaining(d.remaining ?? 0));
  }, []);

  async function generate() {
    setLoading(true);
    setNewCodes([]);
    setError("");
    try {
      const res = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count, createdById: adminId }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewCodes(data.codes);
        setRemaining((r) => (r !== null ? r - data.codes.length : null));
        router.refresh();
      } else {
        setError(data.error ?? "Erro ao gerar convites");
      }
    } finally {
      setLoading(false);
    }
  }

  const esgotado = remaining !== null && remaining <= 0;

  return (
    <div className="flex flex-col items-end gap-2">
      {remaining !== null && (
        <p className="text-xs" style={{ color: esgotado ? "#b91c1c" : "var(--color-text-muted)" }}>
          {esgotado ? "limite de convites atingido" : `${remaining} convite${remaining !== 1 ? "s" : ""} disponível${remaining !== 1 ? "is" : ""}`}
        </p>
      )}
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          max={remaining ?? 1}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          className="input-base w-16 text-center text-sm"
          disabled={esgotado}
        />
        <button onClick={generate} disabled={loading || esgotado} className="btn-primary text-sm">
          {loading ? "gerando…" : "gerar convites"}
        </button>
      </div>
      {error && (
        <p className="text-xs" style={{ color: "#b91c1c" }}>{error}</p>
      )}
      {newCodes.length > 0 && (
        <div
          className="p-3 rounded-xl text-xs font-mono"
          style={{ background: "var(--color-tece-50)", color: "var(--color-tece-700)", border: "1px solid var(--color-tece-200)" }}
        >
          {newCodes.map((c) => (
            <div key={c}>{c}</div>
          ))}
        </div>
      )}
    </div>
  );
}
