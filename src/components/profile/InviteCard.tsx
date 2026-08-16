"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ReputationBadge from "@/components/reputation/ReputationBadge";
import type { Gender } from "@/types";

type InviteCode = { code: string; createdAt: string };

type InviteStatus = {
  quota: number | null;
  usedThisMonth: number;
  generatedThisMonth: number;
  activeInvite: InviteCode | null;
  activeInvites: InviteCode[];
  canGenerate: boolean;
  isAdmin: boolean;
  nextResetAt: string;
  bonusRemaining: number;
};

type InviteTree = {
  padrinho: {
    id: string;
    username: string;
    profileImageUrl: string | null;
    reputationScore: number;
    tier: string;
  } | null;
  afilhados: Array<{
    id: string;
    username: string;
    profileImageUrl: string | null;
    reputationScore: number;
    tier: string;
    joinedAt: string;
    lastActiveAt: string | null;
  }>;
};

type Props = {
  invitedByGender: Gender | null;
};

function formatResetDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

function getSponsorLabel(gender: Gender | null) {
  return gender === "M" ? "madrinha" : "padrinho";
}

async function parseJson<T>(response: Response): Promise<T | null> {
  return (await response.json().catch(() => null)) as T | null;
}

async function loadInviteData(signal?: AbortSignal) {
  const [statusResponse, treeResponse] = await Promise.all([
    fetch("/api/invites", { signal, cache: "no-store" }),
    fetch("/api/invites/tree", { signal, cache: "no-store" }),
  ]);

  const statusData = await parseJson<InviteStatus & { error?: string }>(statusResponse);
  const treeData = await parseJson<InviteTree & { error?: string }>(treeResponse);

  if (!statusResponse.ok || !statusData || "error" in statusData) {
    throw new Error(statusData?.error || "Não foi possível carregar seu convite.");
  }

  if (!treeResponse.ok || !treeData || "error" in treeData) {
    throw new Error(treeData?.error || "Não foi possível carregar sua árvore de convites.");
  }

  return { status: statusData, tree: treeData };
}

function InviteAvatar({ username, profileImageUrl }: { username: string; profileImageUrl: string | null }) {
  if (profileImageUrl) {
    return <img src={profileImageUrl} alt={username} className="h-11 w-11 rounded-full object-cover" />;
  }

  return (
    <div
      className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-black"
      style={{ background: "rgba(49, 213, 222, 0.14)", color: "var(--color-tece-500)" }}
    >
      {username[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

export default function InviteCard({ invitedByGender }: Props) {
  const [status, setStatus] = useState<InviteStatus | null>(null);
  const [tree, setTree] = useState<InviteTree | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function hydrateCard() {
      setError("");

      try {
        const data = await loadInviteData(controller.signal);
        setStatus(data.status);
        setTree(data.tree);
      } catch (err) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          setError(err instanceof Error ? err.message : "Não foi possível carregar os convites.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void hydrateCard();

    return () => controller.abort();
  }, []);

  async function handleGenerateInvite() {
    setIsGenerating(true);
    setError("");

    try {
      const response = await fetch("/api/invites", { method: "POST" });
      const data = await parseJson<{ code?: string; error?: string }>(response);

      if (!response.ok || !data?.code) {
        setError(data?.error || "Não foi possível gerar seu convite.");
        return;
      }

      // Recarrega o status real: reflete o novo convite na lista de pendentes,
      // o saldo de bônus consumido e se ainda há cota para gerar mais.
      const fresh = await loadInviteData();
      setStatus(fresh.status);
      setTree(fresh.tree);
    } catch {
      setError("Não foi possível gerar seu convite.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCopy(code: string) {
    try {
      await navigator.clipboard.writeText(`https://qrtece.com.br/cadastro?convite=${code}`);
      setCopiedCode(code);
      window.setTimeout(() => setCopiedCode((current) => (current === code ? null : current)), 1800);
    } catch {
      setError("Não foi possível copiar o código.");
    }
  }

  const sponsorLabel = getSponsorLabel(invitedByGender);
  const allActiveInvites = status?.activeInvites ?? (status?.activeInvite ? [status.activeInvite] : []);
  // Admin gera convites ilimitados — mostrar só o último evita uma lista gigante.
  // Os anteriores continuam válidos no banco, apenas não aparecem na tela.
  const activeInvites = status?.isAdmin ? allActiveInvites.slice(0, 1) : allActiveInvites;
  const canGenerate = status?.canGenerate ?? false;
  const bonusRemaining = status?.bonusRemaining ?? 0;
  // Score baixo só bloqueia quando não há nada a enviar: nem cota regular, nem bônus.
  const isLowScore = status ? status.quota === 0 && bonusRemaining === 0 && !canGenerate : false;
  const reachedMonthlyLimit = status ? !canGenerate && activeInvites.length === 0 && !isLowScore : false;
  const afilhados = tree?.afilhados ?? [];

  return (
    <section className="card p-6 flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="m-0 text-base font-black" style={{ color: "var(--color-text)" }}>
          convites
        </h2>
        <p className="m-0 text-sm font-bold" style={{ color: "var(--color-text-muted)" }}>
          seu círculo social e o convite mensal do qr.tecê
        </p>
      </div>

      {isLoading ? (
        <div
          className="rounded-2xl border px-4 py-5 text-sm font-bold"
          style={{ borderColor: "var(--color-border)", background: "rgba(49, 213, 222, 0.08)", color: "var(--color-text-muted)" }}
        >
          carregando seus convites...
        </div>
      ) : error ? (
        <div
          className="rounded-2xl border px-4 py-5 text-sm font-bold"
          style={{ borderColor: "rgba(239, 68, 68, 0.24)", background: "rgba(239, 68, 68, 0.08)", color: "#b91c1c" }}
        >
          {error}
        </div>
      ) : isLowScore ? (
        <div
          className="rounded-2xl border px-4 py-5"
          style={{ borderColor: "var(--color-border)", background: "rgba(148, 163, 184, 0.08)" }}
        >
          <p className="m-0 text-sm font-bold" style={{ color: "var(--color-text)" }}>
            Seu score está baixo demais para convidar. Chegue a Genin para liberar convites.
          </p>
        </div>
      ) : (
        <>
          {activeInvites.length > 0 && (
            <div
              className="rounded-2xl border p-4 flex flex-col gap-3"
              style={{ borderColor: "rgba(49, 213, 222, 0.22)", background: "rgba(49, 213, 222, 0.08)" }}
            >
              <p className="m-0 text-xs font-black uppercase tracking-[0.08em]" style={{ color: "var(--color-text-muted)" }}>
                {activeInvites.length > 1 ? `${activeInvites.length} convites ativos` : "convite ativo"}
              </p>
              {activeInvites.map((invite) => (
                <div
                  key={invite.code}
                  className="flex flex-col gap-3 min-[640px]:flex-row min-[640px]:items-center min-[640px]:justify-between"
                >
                  <code
                    className="rounded-2xl border px-4 py-3 text-lg font-black"
                    style={{ borderColor: "rgba(49, 213, 222, 0.28)", background: "var(--color-surface)", color: "var(--color-text)" }}
                  >
                    {invite.code}
                  </code>
                  <button type="button" onClick={() => void handleCopy(invite.code)} className="btn-secondary">
                    {copiedCode === invite.code ? "copiado!" : "copiar código"}
                  </button>
                </div>
              ))}
              <p className="m-0 text-sm font-bold" style={{ color: "var(--color-text-muted)" }}>
                Compartilhe {activeInvites.length > 1 ? "esses códigos" : "esse código"} com quem você quer convidar.
              </p>
            </div>
          )}

          {canGenerate ? (
            <div
              className="rounded-2xl border p-4"
              style={{ borderColor: "var(--color-border)", background: "rgba(49, 213, 222, 0.08)" }}
            >
              <p className="m-0 text-sm font-bold" style={{ color: "var(--color-text)" }}>
                {bonusRemaining > 0
                  ? "Você tem convites disponíveis para enviar."
                  : "Você tem um convite liberado neste mês."}
              </p>
              <button
                type="button"
                onClick={() => void handleGenerateInvite()}
                disabled={isGenerating}
                className="btn-primary mt-4"
              >
                {isGenerating ? "gerando..." : activeInvites.length > 0 ? "gerar outro convite" : "gerar convite"}
              </button>
            </div>
          ) : reachedMonthlyLimit ? (
            <div
              className="rounded-2xl border px-4 py-5"
              style={{ borderColor: "var(--color-border)", background: "rgba(148, 163, 184, 0.08)" }}
            >
              <p className="m-0 text-sm font-bold" style={{ color: "var(--color-text)" }}>
                Você já usou seus convites deste mês. Próximo em {status ? formatResetDate(status.nextResetAt) : "--/--"}.
              </p>
            </div>
          ) : null}
        </>
      )}

      {bonusRemaining > 0 && (
        <div
          className="rounded-2xl border p-4 flex items-center justify-between gap-3"
          style={{ borderColor: "rgba(253,101,160,.25)", background: "rgba(253,101,160,.06)" }}
        >
          <div>
            <p className="m-0 text-sm font-black" style={{ color: "var(--color-text)" }}>
              convites bônus
            </p>
            <p className="m-0 mt-0.5 text-xs font-bold" style={{ color: "var(--color-text-muted)" }}>
              {bonusRemaining} convite{bonusRemaining !== 1 ? "s" : ""} bônus disponível{bonusRemaining !== 1 ? "is" : ""}
            </p>
          </div>
          <span
            className="text-xs font-black px-2.5 py-1 rounded-full flex-shrink-0"
            style={{ background: "rgba(253,101,160,.18)", color: "var(--color-tece-pink)" }}
          >
            ✓ ativo
          </span>
        </div>
      )}
      {tree?.padrinho && (
        <div className="rounded-2xl border p-4" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
          <p className="m-0 text-sm font-bold" style={{ color: "var(--color-text-muted)" }}>
            Você foi convidado por{" "}
            <Link
              href={`/perfil/${tree.padrinho.username}`}
              className="no-underline transition-opacity hover:opacity-80"
              style={{ color: "var(--color-tece-500)" }}
            >
              @{tree.padrinho.username}
            </Link>{" "}
            - seu {sponsorLabel} no qr.tecê
          </p>
        </div>
      )}

      {afilhados.length > 0 && (
        <div className="flex flex-col gap-3 border-t pt-5" style={{ borderColor: "var(--color-border)" }}>
          <div>
            <h3 className="m-0 text-sm font-black" style={{ color: "var(--color-text)" }}>
              seus afilhados
            </h3>
            <p className="mt-1 mb-0 text-sm font-bold" style={{ color: "var(--color-text-muted)" }}>
              {afilhados.length} {afilhados.length === 1 ? "pessoa entrou" : "pessoas entraram"} com seu convite
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {afilhados.map((afilhado) => (
              <Link
                key={afilhado.id}
                href={`/perfil/${afilhado.username}`}
                className="flex items-center gap-3 rounded-2xl border p-3 no-underline transition-opacity hover:opacity-85"
                style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
              >
                <InviteAvatar username={afilhado.username} profileImageUrl={afilhado.profileImageUrl} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black" style={{ color: "var(--color-text)" }}>
                    @{afilhado.username}
                  </p>
                </div>
                <ReputationBadge score={afilhado.reputationScore} />
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
