"use client";

import Link from "next/link";
import { useState } from "react";

type Props = {
  token: string;
};

export default function RedefinirSenhaForm({ token }: Props) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Não foi possível redefinir sua senha");
        return;
      }

      setSuccess(true);
      setPassword("");
      setConfirmPassword("");
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col gap-4">
        <div
          className="rounded-lg border px-3 py-2 text-sm"
          style={{ background: "#ecfdf5", color: "#166534", borderColor: "#bbf7d0" }}
        >
          Senha redefinida com sucesso.
        </div>
        <Link href="/" className="font-bold underline underline-offset-2" style={{ color: "var(--color-tece-600)" }}>
          entrar
        </Link>
      </div>
    );
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

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
          nova senha
        </label>
        <input
          type="password"
          className="input-base"
          placeholder="mínimo 8 caracteres"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
          confirmar senha
        </label>
        <input
          type="password"
          className="input-base"
          placeholder="repita sua nova senha"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>

      <button type="submit" className="btn-primary mt-1" disabled={loading}>
        {loading ? "Salvando..." : "redefinir senha"}
      </button>
    </form>
  );
}
