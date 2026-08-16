"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  initialInviteCode?: string;
};

export default function CadastroForm({ initialInviteCode = "" }: Props) {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState(initialInviteCode);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [gender, setGender] = useState<"H" | "M" | "">("");
  const [password, setPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!gender) {
      setError("Selecione o gênero");
      return;
    }

    if (!termsAccepted) {
      setError("Você precisa aceitar os termos para continuar");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/cadastro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode, email, username, gender, password, termsAccepted }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Erro ao criar conta");
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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
          código de convite
        </label>
        <input
          type="text"
          className="input-base font-mono uppercase tracking-widest"
          placeholder="EX: A1B2C3D4"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
          required
          maxLength={32}
        />
      </div>

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

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
          username
        </label>
        <div className="input-base flex items-center gap-1">
          <span className="select-none text-sm" style={{ color: "var(--color-text-muted)" }}>
            @
          </span>
          <input
            type="text"
            className="min-w-0 flex-1 border-0 bg-transparent p-0 outline-none"
            style={{ color: "var(--color-text)", fontSize: "0.95rem", fontFamily: "inherit" }}
            placeholder="seu_username"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
            required
            minLength={3}
            maxLength={30}
          />
        </div>
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          letras minúsculas, números e _ - não pode mudar depois
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
          gênero
        </label>
        <div className="flex gap-2">
          {(["H", "M"] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGender(g)}
              className="flex-1 rounded-lg py-2 text-sm font-semibold transition-all"
              style={{
                background: gender === g ? "var(--color-tece-500)" : "transparent",
                color: gender === g ? "white" : "var(--color-text-muted)",
                border: `1.5px solid ${gender === g ? "var(--color-tece-500)" : "var(--color-border)"}`,
              }}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
          senha
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

      <label
        className="flex items-start gap-3 rounded-xl border p-3 text-sm leading-5"
        style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
      >
        <input
          type="checkbox"
          checked={termsAccepted}
          onChange={(e) => setTermsAccepted(e.target.checked)}
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
        {loading ? "Criando conta..." : "Criar minha conta"}
      </button>
    </form>
  );
}
