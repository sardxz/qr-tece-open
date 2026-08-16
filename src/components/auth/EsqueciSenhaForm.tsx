"use client";

import { useState } from "react";

export default function EsqueciSenhaForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Não foi possível enviar o link");
        return;
      }

      setSuccess(true);
      setEmail("");
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

      {success && (
        <div
          className="rounded-lg border px-3 py-2 text-sm"
          style={{ background: "#ecfdf5", color: "#166534", borderColor: "#bbf7d0" }}
        >
          Se o e-mail estiver cadastrado, você receberá um link em breve.
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
          e-mail
        </label>
        <input
          type="email"
          className="input-base"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </div>

      <button type="submit" className="btn-primary mt-1" disabled={loading}>
        {loading ? "Enviando..." : "enviar link"}
      </button>
    </form>
  );
}
