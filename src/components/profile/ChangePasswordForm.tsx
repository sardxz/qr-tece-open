"use client";

import { useState } from "react";

export default function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    if (newPassword.length < 8) {
      setError("A nova senha deve ter pelo menos 8 caracteres.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/users/me/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao alterar senha.");
        return;
      }

      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setError("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
          senha atual
        </label>
        <input
          type="password"
          className="input-base"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
          nova senha
          <span className="ml-2 text-xs font-normal" style={{ color: "var(--color-text-muted)" }}>
            mínimo 8 caracteres
          </span>
        </label>
        <input
          type="password"
          className="input-base"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
          confirmar nova senha
        </label>
        <input
          type="password"
          className="input-base"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          required
        />
      </div>

      {error && (
        <p className="text-sm font-bold" style={{ color: "#b91c1c" }}>{error}</p>
      )}

      {success && (
        <p className="text-sm font-bold" style={{ color: "#16a34a" }}>
          Senha alterada com sucesso.
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          className="btn-primary"
          disabled={loading || !currentPassword || !newPassword || !confirmPassword}
        >
          {loading ? "salvando..." : "alterar senha"}
        </button>
      </div>
    </form>
  );
}
