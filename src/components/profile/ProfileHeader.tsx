"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import FriendButton from "@/components/friends/FriendButton";
import DepoForm from "@/components/profile/DepoForm";
import ProfileCover from "@/components/profile/ProfileCover";
import ReputationBadge from "@/components/reputation/ReputationBadge";
import { getReputationTier } from "@/components/reputation/reputation";
import type { FriendState, PresenceStatus, ProfileStats, ProfileUser } from "@/types";
import { formatMemberSince, formatLocation } from "@/lib/utils";

type Props = {
  user: ProfileUser;
  stats: ProfileStats;
  presenceStatus: PresenceStatus;
  isOwnProfile: boolean;
  friendState: FriendState;
};

type ProfileIdentityProps = {
  user: ProfileUser;
  presenceStatus: PresenceStatus;
  isOwnProfile: boolean;
};

type ProfileActionsProps = {
  user: ProfileUser;
  isOwnProfile: boolean;
  friendState: FriendState;
};

type ProfileStatsBarProps = {
  stats: ProfileStats;
};

type ProfileStatsItem = {
  label: string;
  value: number;
  href?: string;
};

function InfoBadgeIcon({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-grid h-6 w-6 place-items-center rounded-md text-[12px]"
      style={{ background: "rgba(49,213,222,.12)", color: "var(--color-tece-500)" }}
    >
      {children}
    </span>
  );
}

function ProfileIdentity({ user, presenceStatus, isOwnProfile }: ProfileIdentityProps) {
  const router = useRouter();
  const [statusText, setStatusText] = useState(user.statusText);
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [draftStatus, setDraftStatus] = useState(user.statusText ?? "");
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [statusError, setStatusError] = useState("");
  const location = formatLocation(user.city, user.state);
  const presence = presenceStatus;
  const avatarBorderColor =
    presenceStatus === "online" ? "#22c55e" :
    presenceStatus === "busy" ? "#f87171" :
    presenceStatus === "away" ? "#fbbf24" :
    "var(--color-border)";
  const sponsorLabel = user.invitedBy?.gender === "M" ? "madrinha" : "padrinho";

  async function saveStatus() {
    const trimmed = draftStatus.trim();
    const nextStatus = trimmed.length > 0 ? trimmed : null;
    setIsSavingStatus(true);
    setStatusError("");

    try {
      const res = await fetch("/api/users/me/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statusText: nextStatus }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setStatusError(
          data && typeof data === "object" && "error" in data && typeof data.error === "string"
            ? data.error
            : "Erro ao salvar status.",
        );
        return;
      }

      setStatusText(nextStatus);
      setDraftStatus(nextStatus ?? "");
      setIsEditingStatus(false);
      router.refresh();
    } catch {
      setStatusError("Erro de conexao.");
    } finally {
      setIsSavingStatus(false);
    }
  }

  function cancelStatusEdit() {
    setDraftStatus(statusText ?? "");
    setStatusError("");
    setIsEditingStatus(false);
  }

  return (
    <div className="flex flex-col items-center text-center min-[769px]:items-start min-[769px]:text-left">
      <div
        className="relative -mt-16 h-[115px] w-[115px] overflow-hidden rounded-full border-[4px] shadow-lg"
        style={{
          background: "var(--color-tece-100)",
          borderColor: avatarBorderColor,
        }}
      >
        {user.profileImageUrl ? (
          <img src={user.profileImageUrl} alt={user.username} className="h-full w-full object-cover" />
        ) : (
          <div
            className="grid h-full w-full place-items-center text-4xl font-black"
            style={{ color: "var(--color-tece-700)" }}
          >
            {user.username[0]?.toUpperCase() ?? "?"}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-1">
        <div className="flex flex-wrap items-center justify-center gap-2 min-[769px]:justify-start">
          <h1 className="m-0 text-[30px] font-black leading-none" style={{ color: "var(--color-text)" }}>
            {user.username}
          </h1>
        </div>
        <p className="text-sm font-semibold" style={{ color: "var(--color-text-muted)" }}>
          @{user.username}
        </p>
        {user.invitedBy && (
          <p className="text-sm font-bold" style={{ color: "var(--color-text-muted)" }}>
            entrou por convite de{" "}
            <Link
              href={`/perfil/${user.invitedBy.username}`}
              className="no-underline transition-opacity hover:opacity-80"
              style={{ color: "var(--color-tece-500)" }}
            >
              @{user.invitedBy.username}
            </Link>{" "}
            - seu {sponsorLabel} no tece
          </p>
        )}
        {user.invitedUsersCount > 0 && (
          <p className="text-sm font-bold" style={{ color: "var(--color-text-muted)" }}>
            convidou {user.invitedUsersCount} {user.invitedUsersCount === 1 ? "pessoa" : "pessoas"} para o qr.tece
          </p>
        )}
      </div>

      <div className="mt-2 flex items-center gap-2 text-sm font-semibold">
        <span
          className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em]"
          style={{
            background:
              presence === "busy"
                ? "rgba(239, 68, 68, 0.18)"
                : presence === "online"
                  ? "rgba(34, 197, 94, 0.18)"
                  : presence === "away"
                    ? "rgba(251, 191, 36, 0.18)"
                    : "rgba(148, 163, 184, 0.16)",
            color:
              presence === "busy"
                ? "#f87171"
                : presence === "online"
                  ? "#4ade80"
                  : presence === "away"
                    ? "#fbbf24"
                    : "var(--color-text-muted)",
            border: `1px solid ${
              presence === "busy"
                ? "rgba(239, 68, 68, 0.28)"
                : presence === "online"
                  ? "rgba(34, 197, 94, 0.3)"
                  : presence === "away"
                    ? "rgba(251, 191, 36, 0.28)"
                    : "rgba(148, 163, 184, 0.2)"
            }`,
          }}
        >
          {presence === "busy" ? "ocupado" : presence === "online" ? "online" : presence === "away" ? "ausente" : "offline"}
        </span>
      </div>

      <div className="mt-4 w-full max-w-[520px]">
        {isEditingStatus ? (
          <div className="flex flex-col gap-2">
            <div
              className="flex flex-col gap-2 rounded-2xl border p-3 min-[769px]:flex-row min-[769px]:items-center"
              style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
            >
              <input
                type="text"
                value={draftStatus}
                onChange={(e) => setDraftStatus(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); void saveStatus(); }
                  if (e.key === "Escape") { e.preventDefault(); cancelStatusEdit(); }
                }}
                maxLength={60}
                className="input-base flex-1"
                placeholder="escreva seu status"
                autoFocus
              />
              <div className="flex gap-2 self-end min-[769px]:self-auto">
                <button type="button" onClick={() => void saveStatus()} disabled={isSavingStatus} className="btn-primary text-sm">
                  {isSavingStatus ? "salvando..." : "salvar"}
                </button>
                <button type="button" onClick={cancelStatusEdit} disabled={isSavingStatus} className="btn-secondary text-sm">
                  cancelar
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              {statusError ? (
                <p className="text-xs font-semibold" style={{ color: "#b91c1c" }}>{statusError}</p>
              ) : (
                <span />
              )}
              <p className="text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>
                {draftStatus.length}/60
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 min-[769px]:justify-start">
            {statusText ? (
              <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>{statusText}</p>
            ) : isOwnProfile ? (
              <p className="text-sm font-semibold" style={{ color: "var(--color-text-muted)" }}>adicione um status</p>
            ) : null}

            {isOwnProfile && (
              <button
                type="button"
                onClick={() => { setDraftStatus(statusText ?? ""); setStatusError(""); setIsEditingStatus(true); }}
                className="rounded-full border px-2 py-1 text-xs font-bold transition-opacity hover:opacity-80"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
                title="editar status"
              >
                editar
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-2 text-sm font-semibold" style={{ color: "var(--color-text-muted)" }}>
        {location && (
          <div className="flex items-center justify-center gap-2 min-[769px]:justify-start">
            <InfoBadgeIcon>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M6 10.5s3-2.6 3-5A3 3 0 1 0 3 5.5c0 2.4 3 5 3 5Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="6" cy="5" r="1" fill="currentColor" />
              </svg>
            </InfoBadgeIcon>
            <p>{location}</p>
          </div>
        )}
        <div className="flex items-center justify-center gap-2 min-[769px]:justify-start">
          <InfoBadgeIcon>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <rect x="1.5" y="2.5" width="9" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M1.5 4.5h9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M4 1.5v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M8 1.5v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </InfoBadgeIcon>
          <p>membro desde {formatMemberSince(user.createdAt)}</p>
        </div>
      </div>
    </div>
  );
}

const TIER_COLORS: Record<string, string> = {
  NPC: "var(--color-text-muted)",
  Genin: "var(--color-tece-500)",
  "tecê raiz": "var(--color-tece-pink)",
  OG: "#d97706",
  "Lenda do tecê": "#f97316",
};

function ReputationBlock({ score }: { score: number }) {
  const tier = getReputationTier(score);
  const color = TIER_COLORS[tier] ?? "var(--color-text-muted)";

  return (
    <fieldset
      className="w-full min-[769px]:w-auto rounded-2xl border-2 px-5 pb-5 pt-1"
      style={{ borderColor: color, margin: 0 }}
    >
      <legend className="ml-2 px-1.5 text-[11px] font-bold" style={{ color: "var(--color-text)" }}>
        reputação
      </legend>
      <div className="flex items-center gap-3 mt-1">
        <span className="text-[34px] font-black leading-none tabular-nums" style={{ color }}>
          {score}
        </span>
        <ReputationBadge score={score} />
      </div>
    </fieldset>
  );
}

function ProfileActions({ user, isOwnProfile, friendState }: ProfileActionsProps) {
  const [showDepoForm, setShowDepoForm] = useState(false);

  return (
    <div className="flex flex-col items-center gap-3 self-stretch min-[769px]:items-end min-[769px]:justify-start">
      {isOwnProfile ? (
        <Link href="/configuracoes" className="btn-secondary min-w-[160px] text-center">
          editar perfil
        </Link>
      ) : (
        <div className="flex w-full max-w-[380px] flex-col gap-3 min-[769px]:items-stretch">
          <div className="flex w-full flex-wrap items-center justify-center gap-2 min-[769px]:justify-end">
            <FriendButton initialState={friendState} receiverUsername={user.username} />
          </div>
          <div className="flex w-full flex-col items-center gap-2 min-[769px]:items-stretch">
            <button
              type="button"
              className="btn-secondary min-w-[170px]"
              onClick={() => setShowDepoForm((v) => !v)}
            >
              {showDepoForm ? "cancelar" : "deixar um depo"}
            </button>
            {showDepoForm && (
              <div className="w-full rounded-2xl border p-3" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
                <DepoForm recipientUsername={user.username} />
              </div>
            )}
          </div>
        </div>
      )}
      <div className="mt-auto w-full min-[769px]:w-auto">
        <ReputationBlock score={user.reputationScore} />
      </div>
    </div>
  );
}

function ProfileStatsBar({ stats }: ProfileStatsBarProps) {
  const items: ProfileStatsItem[] = [
    { label: "depos", value: stats.depos, href: "#depos" },
    { label: "badges", value: stats.badges },
    { label: "comus", value: stats.communities },
    { label: "curtidas recebidas", value: stats.likesReceived },
    { label: "amigos", value: stats.friends },
  ];

  return (
    <div
      className="w-full overflow-hidden rounded-2xl border min-[769px]:rounded-[18px] min-[1400px]:max-w-[72%] min-[1800px]:max-w-[56%]"
      style={{ borderColor: "var(--color-border)", background: "rgba(7, 16, 34, 0.32)" }}
    >
      <div className="grid grid-cols-2 min-[560px]:grid-cols-3 min-[769px]:grid-cols-5">
        {items.map((item, index) => (
          item.href ? (
            <a
              key={item.label}
              href={item.href}
              className="relative block px-3 py-2.5 text-center transition-opacity hover:opacity-80 min-[769px]:px-4 min-[769px]:py-3"
            >
              {index < items.length - 1 && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute right-0 top-1/2 hidden h-[48%] w-px -translate-y-1/2 min-[769px]:block"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                />
              )}
              <span className="block text-[21px] font-black leading-none min-[769px]:text-[24px]" style={{ color: "var(--color-tece-500)" }}>
                {item.value}
              </span>
              <span className="mt-0.5 block text-[9px] font-semibold uppercase leading-tight tracking-[0.04em] min-[769px]:text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                {item.label}
              </span>
            </a>
          ) : (
            <button
              key={item.label}
              type="button"
              className="relative px-3 py-2.5 text-center transition-opacity hover:opacity-80 min-[769px]:px-4 min-[769px]:py-3"
              style={{ cursor: "pointer" }}
            >
              {index < items.length - 1 && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute right-0 top-1/2 hidden h-[48%] w-px -translate-y-1/2 min-[769px]:block"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                />
              )}
              <span className="block text-[21px] font-black leading-none min-[769px]:text-[24px]" style={{ color: "var(--color-tece-500)" }}>
                {item.value}
              </span>
              <span className="mt-0.5 block text-[9px] font-semibold uppercase leading-tight tracking-[0.04em] min-[769px]:text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                {item.label}
              </span>
            </button>
          )
        ))}
      </div>
    </div>
  );
}

export default function ProfileHeader({ user, stats, presenceStatus, isOwnProfile, friendState }: Props) {
  return (
    <section className="card overflow-hidden">
      <ProfileCover
        initialCoverUrl={user.profileCoverUrl}
        username={user.username}
        isOwnProfile={isOwnProfile}
      />
      <div className="p-5 min-[769px]:p-6">
        <div className="grid min-w-0 grid-cols-1 gap-6 min-[1200px]:grid-cols-[minmax(0,1fr)_auto] min-[1200px]:items-start">
          <ProfileIdentity user={user} presenceStatus={presenceStatus} isOwnProfile={isOwnProfile} />
          <ProfileActions user={user} isOwnProfile={isOwnProfile} friendState={friendState} />
        </div>
        <div className="mt-6 border-t pt-5" style={{ borderColor: "var(--color-border)" }}>
          <ProfileStatsBar stats={stats} />
        </div>
      </div>
    </section>
  );
}
