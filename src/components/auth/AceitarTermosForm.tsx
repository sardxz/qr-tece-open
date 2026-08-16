"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AceitarTermosForm() {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!accepted) {
      setError("Você precisa aceitar os termos para continuar");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/accept-terms", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Não foi possível registrar seu aceite");
        return;
      }

      router.push("/home");
      router.refresh();
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <div
          className="rounded-lg border px-3 py-2 text-sm"
          style={{ background: "#fef2f2", color: "#b91c1c", borderColor: "#fecaca" }}
        >
          {error}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <p className="m-0 text-sm leading-6" style={{ color: "var(--color-text-muted)" }}>
          Os nossos termos foram atualizados. Para continuar usando o qr.tecê, precisamos que você revise e confirme o novo aceite.
        </p>
      </div>

      <label
        className="flex items-start gap-3 rounded-xl border p-3 text-sm leading-5"
        style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
      >
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-0.5 h-4 w-4 flex-shrink-0 accent-[var(--color-tece-500)]"
          required
        />
        <span>
          Li e aceito os{" "}
          <Link href="/termos" className="font-bold underline underline-offset-2" style={{ color: "var(--color-tece-600)" }}>
            Termos de Uso
          </Link>{" "}
          e a{" "}
          <Link href="/privacidade" className="font-bold underline underline-offset-2" style={{ color: "var(--color-tece-600)" }}>
            Política de Privacidade
          </Link>
        </span>
      </label>

      <button type="submit" className="btn-primary mt-1" disabled={loading}>
        {loading ? "Continuando..." : "continuar"}
      </button>
    </form>
  );
}
