"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";
import { getReputationTier } from "@/components/reputation/reputation";

const TIER_COLORS: Record<string, { color: string; background: string; borderColor: string }> = {
  NPC:            { color: "var(--color-text-muted)",  background: "rgba(148,163,184,0.14)", borderColor: "rgba(148,163,184,0.24)" },
  Genin:          { color: "var(--color-tece-500)",    background: "rgba(49,213,222,0.14)",  borderColor: "rgba(49,213,222,0.26)"  },
  "tecê raiz":    { color: "var(--color-tece-pink)",   background: "rgba(253,101,160,0.14)", borderColor: "rgba(253,101,160,0.24)" },
  OG:             { color: "#d97706",                  background: "rgba(245,158,11,0.14)",  borderColor: "rgba(245,158,11,0.24)"  },
  "Lenda do tecê":{ color: "#f97316",                  background: "rgba(249,115,22,0.14)",  borderColor: "rgba(249,115,22,0.30)"  },
};

type SidebarUser = {
  username: string;
  gender: "H" | "M";
  bio: string | null;
  profilePhrase: string | null;
  profileImageUrl: string | null;
  city: string | null;
  state: string | null;
  birthYear: number | null;
  postsCount: number;
  communitiesCount: number;
  deposCount: number;
  friendsCount: number;
  activityCount: number;
  manualStatus: "ONLINE" | "BUSY" | "AWAY" | "OFFLINE" | null;
  reputationScore: number;
};

type Props = { user: SidebarUser };

type ManualStatus = NonNullable<SidebarUser["manualStatus"]>;

const STATUS_OPTIONS: Array<{
  value: ManualStatus;
  label: string;
  color: string;
}> = [
  { value: "ONLINE", label: "online", color: "#22c55e" },
  { value: "BUSY", label: "ocupado", color: "#f87171" },
  { value: "AWAY", label: "ausente", color: "#fbbf24" },
  { value: "OFFLINE", label: "offline", color: "var(--color-border)" },
];

const menuItems = [
  { icon: <IconAmigos />,      label: "amigos",      href: "/amigos" },
  { icon: <IconDepos />,       label: "depos",       href: "/depos/recebidos" },
  { icon: <IconComunidades />, label: "comunidades", href: "/comunidades" },
  { icon: <IconMencoes />,     label: "atividade",   href: "/atividade" },
];

export default function Sidebar({ user }: Props) {
  const router = useRouter();
  const { theme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [optimisticStatus, setOptimisticStatus] = useState<{
    sourceStatus: ManualStatus;
    value: ManualStatus;
  } | null>(null);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement>(null);
  const sidebarBg = theme === "dark"
    ? "#1e2235"
    : "linear-gradient(180deg, #daeeff 0%, #ffffff 70%)";

  const age = user.birthYear ? new Date().getFullYear() - user.birthYear : null;
  const location = [user.city?.toLowerCase(), user.state?.toUpperCase()].filter(Boolean).join(", ");

  const counts: Record<string, number> = {
    amigos:      user.friendsCount,
    depos:       user.deposCount,
    comunidades: user.communitiesCount,
    atividade:   user.activityCount,
  };
  const serverStatus = user.manualStatus ?? "ONLINE";
  const manualStatus =
    optimisticStatus && optimisticStatus.sourceStatus === serverStatus
      ? optimisticStatus.value
      : serverStatus;
  const currentStatus = STATUS_OPTIONS.find((option) => option.value === manualStatus) ?? STATUS_OPTIONS[0];

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!statusMenuRef.current?.contains(event.target as Node)) {
        setStatusMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setStatusMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  async function handleStatusChange(nextStatus: ManualStatus) {
    if (nextStatus === manualStatus || isSavingStatus) {
      setStatusMenuOpen(false);
      return;
    }

    const nextOptimisticStatus = { sourceStatus: serverStatus, value: nextStatus };
    setOptimisticStatus(nextOptimisticStatus);
    setStatusMenuOpen(false);
    setIsSavingStatus(true);

    try {
      const response = await fetch("/api/users/me/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manualStatus: nextStatus }),
      });

      if (!response.ok) {
        setOptimisticStatus(null);
        return;
      }

      router.refresh();
    } catch {
      setOptimisticStatus(null);
    } finally {
      setIsSavingStatus(false);
    }
  }

  const renderMenuItems = () => menuItems.map(({ icon, label, href }) => {
    const count = counts[label];
    const badgeBg    = count > 0 ? "rgba(34,197,94,.18)"  : "rgba(150,150,150,.15)";
    const badgeColor = count > 0 ? "#16a34a"              : "#9ca3af";
    const inner = (
      <>
        <span className="inline-flex w-6 items-center justify-center flex-shrink-0">
          {icon}
        </span>
        <span className="flex-1 text-sm">{label}</span>
        <span
          className="grid h-7 min-w-7 place-items-center rounded-full px-2 text-xs font-black"
          style={{ background: badgeBg, color: badgeColor }}
        >
          {count}
        </span>
      </>
    );

    return href ? (
      <Link
        key={label}
        href={href}
        className="flex items-center gap-3 font-black no-underline"
        style={{ color: "var(--color-text)" }}
      >
        {inner}
      </Link>
    ) : (
      <div key={label} className="flex items-center gap-3 font-black" style={{ color: "var(--color-text)" }}>
        {inner}
      </div>
    );
  });

  return (
    <aside className="sidebar-root flex flex-col gap-7 max-[900px]:gap-4 pt-[22px]">
      <section
        className="sidebar-card rounded-[18px] border p-7 tece-shadow"
        style={{ background: sidebarBg, borderColor: "var(--color-border)" }}
      >
        {/* Avatar */}
        <div className="relative mx-auto mb-5 w-fit" ref={statusMenuRef}>
          <Link href={`/perfil/${user.username}`} className="block text-center">
            <div className="sidebar-avatar rounded-full p-[4px]" style={{ background: currentStatus.color, width: 162, height: 162 }}>
              <div
                className="h-full w-full rounded-full overflow-hidden flex items-center justify-center text-6xl font-black"
                style={{ background: "rgba(49,213,222,.18)", color: "var(--color-tece-blue)" }}
              >
                {user.profileImageUrl ? (
                  <img src={user.profileImageUrl} alt={user.username} className="w-full h-full object-cover" />
                ) : (
                  user.username[0].toUpperCase()
                )}
              </div>
            </div>
          </Link>

          <button
            type="button"
            aria-label={`Alterar status. Atual: ${currentStatus.label}`}
            aria-haspopup="menu"
            aria-expanded={statusMenuOpen}
            onClick={() => setStatusMenuOpen((open) => !open)}
            className="absolute bottom-2 right-2 grid h-8 w-8 place-items-center rounded-full transition-transform hover:scale-105"
            style={{
              background: theme === "dark" ? "#0f172a" : "#ffffff",
              border: `3px solid ${theme === "dark" ? "#111827" : "#ffffff"}`,
            }}
          >
            <span
              className="block h-4 w-4 rounded-full"
              style={{
                background: currentStatus.color,
                opacity: isSavingStatus ? 0.75 : 1,
              }}
            />
          </button>

          {statusMenuOpen && (
            <div
              role="menu"
              aria-label="Selecionar status"
              className="absolute right-0 top-[calc(100%+10px)] z-20 min-w-[170px] rounded-2xl border p-2 shadow-2xl"
              style={{
                background: "var(--color-surface)",
                borderColor: "var(--color-border)",
              }}
            >
              {STATUS_OPTIONS.map((option) => {
                const isActive = option.value === manualStatus;

                return (
                  <button
                    key={option.value}
                    type="button"
                    role="menuitemradio"
                    aria-checked={isActive}
                    onClick={() => void handleStatusChange(option.value)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold transition-opacity hover:opacity-80"
                    style={{
                      background: isActive ? "rgba(148, 163, 184, 0.12)" : "transparent",
                      color: "var(--color-text)",
                    }}
                  >
                    <span
                      className="block h-3.5 w-3.5 rounded-full flex-shrink-0"
                      style={{ background: option.color }}
                    />
                    <span className="flex-1">{option.label}</span>
                    {isActive && (
                      <span className="text-[11px] font-black uppercase" style={{ color: "var(--color-text-muted)" }}>
                        atual
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="sidebar-profile-name text-[22px] font-black leading-tight" style={{ color: "var(--color-text)" }}>
          @{user.username}
        </div>

        {user.profilePhrase && (
          <div className="sidebar-profile-phrase mt-1 text-sm italic" style={{ color: "var(--color-tece-600)" }}>
            &ldquo;{user.profilePhrase}&rdquo;
          </div>
        )}

        <div className="sidebar-profile-details mt-1.5 text-base font-semibold leading-relaxed" style={{ color: "var(--color-text)" }}>
          {age ? `${age} anos` : user.bio || "perfil em construção"}
          {location && <><br />{location}</>}
        </div>


        {/* Divisor com toggle mobile */}
        <button
          className="sidebar-menu-toggle my-6 flex w-full items-center gap-2 border-0 bg-transparent p-0 min-[1281px]:hidden"
          onClick={() => setMenuOpen(v => !v)}
          style={{ cursor: "pointer" }}
        >
          <div className="flex-1 h-px" style={{ background: "var(--color-border)" }} />
          <span className="text-xs font-black" style={{ color: "var(--color-text-muted)" }}>
            {menuOpen ? "recolher" : "meu menu"}
          </span>
          <svg
            width="14" height="14" viewBox="0 0 14 14" fill="none"
            style={{
              color: "var(--color-text-muted)",
              transition: "transform 0.2s",
              transform: menuOpen ? "rotate(180deg)" : "rotate(0deg)",
            }}
          >
            <path d="M2 4.5l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div className="flex-1 h-px" style={{ background: "var(--color-border)" }} />
        </button>

        {/* Divisor PC (sempre visível) */}
        <div className="my-6 h-px max-[1280px]:hidden" style={{ background: "var(--color-border)" }} />

        {/* Menu alinhado */}
        <div className={`sidebar-menu-flow flex flex-col gap-3 ${menuOpen ? "" : "max-[1280px]:hidden"}`}>
          {renderMenuItems()}
        </div>

        <div className="my-6 h-px" style={{ background: "var(--color-border)" }} />

        <div className="sidebar-love flex items-center justify-center gap-2 font-mono text-[34px] font-black tracking-[-2px]" style={{ color: "#1976c9" }}>
          <span>I</span>
          <PixelHeart />
          <span>00&apos;s</span>
        </div>
      </section>

    </aside>
  );
}

function IconAmigos() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="7.5" cy="7" r="3.5" fill="#60a5fa"/>
      <path d="M1 17c0-3.314 2.91-6 6.5-6s6.5 2.686 6.5 6" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
      <circle cx="15" cy="6.5" r="2.5" fill="#93c5fd"/>
      <path d="M13 17c0-2.21 1.343-4.1 3.2-4.9" stroke="#93c5fd" strokeWidth="1.6" strokeLinecap="round" fill="none"/>
    </svg>
  );
}

function IconDepos() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 17s-7-4.5-7-9a7 7 0 0114 0c0 4.5-7 9-7 9z" fill="#f97316" opacity=".85"/>
      <path d="M10 15s-5-3.2-5-7a5 5 0 0110 0c0 3.8-5 7-5 7z" fill="#fed7aa" opacity=".5"/>
    </svg>
  );
}

function IconComunidades() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="8.5" stroke="#a78bfa" strokeWidth="1.5" fill="#a78bfa" fillOpacity=".15"/>
      <ellipse cx="10" cy="10" rx="3.5" ry="8.5" stroke="#a78bfa" strokeWidth="1.2" fill="none"/>
      <line x1="1.5" y1="10" x2="18.5" y2="10" stroke="#a78bfa" strokeWidth="1.2"/>
      <line x1="2.5" y1="6.5" x2="17.5" y2="6.5" stroke="#a78bfa" strokeWidth="1" strokeDasharray="1.5 1"/>
      <line x1="2.5" y1="13.5" x2="17.5" y2="13.5" stroke="#a78bfa" strokeWidth="1" strokeDasharray="1.5 1"/>
    </svg>
  );
}

function IconMencoes() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="8.5" stroke="#34d399" strokeWidth="1.5" fill="#34d399" fillOpacity=".12"/>
      <circle cx="10" cy="10" r="3.2" fill="#34d399" opacity=".9"/>
      <path d="M13.2 10a3.2 3.2 0 01-3.2 3.2V15a5 5 0 005-5h-1.8z" fill="#34d399"/>
    </svg>
  );
}

function PixelHeart() {
  return (
    <span aria-label="love" className="grid grid-cols-5 gap-[2px]" role="img" style={{ width: 28 }}>
      {[0, 1, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 17].map((cell) => (
        <span
          key={cell}
          className="h-[5px] w-[5px]"
          style={{
            background: "var(--color-tece-pink)",
            gridColumnStart: (cell % 5) + 1,
            gridRowStart: Math.floor(cell / 5) + 1,
          }}
        />
      ))}
    </span>
  );
}
