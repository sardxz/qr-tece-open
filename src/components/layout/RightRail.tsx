"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";

type Community = {
  id: string;
  name: string;
  slug: string;
  coverImageUrl: string;
  isJoined: boolean;
  _count: { members: number; posts: number };
};

type Friend = {
  id: string;
  username: string;
  gender: string;
  profileImageUrl: string | null;
  presenceStatus: "online" | "busy" | "away" | "offline";
};

type SiteUpdate = {
  id: string;
  content: string;
  type: "FEATURE" | "FIX" | "BUG";
  createdAt: string;
  author: { username: string };
  likeCount: number;
  likedByMe: boolean;
};


const typeLabel: Record<SiteUpdate["type"], { label: string; color: string; bg: string }> = {
  FEATURE: { label: "novidade", color: "#008c9a", bg: "rgba(49,213,222,.15)" },
  FIX:     { label: "correção", color: "#16a34a", bg: "rgba(22,163,74,.12)" },
  BUG:     { label: "bug",      color: "#dc2626", bg: "rgba(220,38,38,.12)" },
};

export default function RightRail() {
  const pathname = usePathname();
  const { theme } = useTheme();
  const cardBg = theme === "dark" ? "#1e2235" : "linear-gradient(135deg, #daeeff 0%, #ffffff 80%)";

  const [communities, setCommunities] = useState<Community[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [updates, setUpdates] = useState<SiteUpdate[]>([]);
  const [loadingCommunities, setLoadingCommunities] = useState(true);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [loadingUpdates, setLoadingUpdates] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        setLoadingCommunities(true);
        setLoadingFriends(true);
        setLoadingUpdates(true);

        const [commRes, friendsRes, updatesRes] = await Promise.all([
          fetch("/api/communities", { cache: "no-store" }),
          fetch("/api/friends", { cache: "no-store" }),
          fetch("/api/updates", { cache: "no-store" }),
        ]);

        const commData = commRes.ok ? (await commRes.json()) as { communities?: Community[] } : {};
        const friendsData = friendsRes.ok ? (await friendsRes.json()) as { friends?: Friend[] } : {};
        const updatesData = updatesRes.ok ? (await updatesRes.json()) as { updates?: SiteUpdate[] } : {};

        if (!ignore) {
          setCommunities(commData.communities ?? []);
          setFriends(friendsData.friends ?? []);
          setUpdates(updatesData.updates ?? []);
        }
      } finally {
        if (!ignore) {
          setLoadingCommunities(false);
          setLoadingFriends(false);
          setLoadingUpdates(false);
        }
      }
    }

    load();
    return () => { ignore = true; };
  }, [pathname]);

  const joinedCommunities = communities.filter((c) => c.isJoined).slice(0, 6);
  const suggestedCommunities = communities
    .filter((c) => !c.isJoined)
    .sort((a, b) => (b._count.members + b._count.posts) - (a._count.members + a._count.posts))
    .slice(0, 4);

  const allOnlineFriends = friends.filter((f) => f.presenceStatus === "online");
  const allBusyFriends = friends.filter((f) => f.presenceStatus === "busy");
  const allAwayFriends = friends.filter((f) => f.presenceStatus === "away");
  const allOfflineFriends = friends.filter((f) => f.presenceStatus === "offline");
  const onlineFriends = allOnlineFriends.slice(0, 6);
  const busyFriends = allBusyFriends.slice(0, 6);
  const awayFriends = allAwayFriends.slice(0, 6);
  const offlineFriends = allOfflineFriends.slice(0, 6);

  return (
    <aside className="max-[900px]:hidden">
    <div className="grid content-start gap-7 pt-[22px] pb-8">

      {/* Amigos */}
      <MiniCard title={`amigos (${friends.length})`} href="/amigos" linkLabel="ver todos" bg={cardBg}>
        {loadingFriends ? (
          <Placeholder>carregando...</Placeholder>
        ) : friends.length === 0 ? (
          <Placeholder>ei, faça alguns amigos 👥</Placeholder>
        ) : (
          <div className="flex max-h-[340px] flex-col gap-3 overflow-x-hidden overflow-y-auto px-5 py-4">
            {onlineFriends.length > 0 && (
              <>
                <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: "#22c55e" }}>
                  ● online ({allOnlineFriends.length})
                </span>
                <div className="grid grid-cols-3 gap-x-3 gap-y-3">
                  {onlineFriends.map((friend) => (
                    <FriendAvatar key={friend.id} friend={friend} />
                  ))}
                </div>
              </>
            )}
            {busyFriends.length > 0 && (
              <>
                <span className="text-[10px] font-black uppercase tracking-wider mt-1" style={{ color: "#f87171" }}>
                  • ocupado ({allBusyFriends.length})
                </span>
                <div className="grid grid-cols-3 gap-x-3 gap-y-3">
                  {busyFriends.map((friend) => (
                    <FriendAvatar key={friend.id} friend={friend} />
                  ))}
                </div>
              </>
            )}
            {awayFriends.length > 0 && (
              <>
                <span className="text-[10px] font-black uppercase tracking-wider mt-1" style={{ color: "#fbbf24" }}>
                  • ausente ({allAwayFriends.length})
                </span>
                <div className="grid grid-cols-3 gap-x-3 gap-y-3">
                  {awayFriends.map((friend) => (
                    <FriendAvatar key={friend.id} friend={friend} />
                  ))}
                </div>
              </>
            )}
            {offlineFriends.length > 0 && (
              <>
                <span className="text-[10px] font-black uppercase tracking-wider mt-1" style={{ color: "#9ca3af" }}>
                  ● offline ({allOfflineFriends.length})
                </span>
                <div className="grid grid-cols-3 gap-x-3 gap-y-3">
                  {offlineFriends.map((friend) => (
                    <FriendAvatar key={friend.id} friend={friend} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </MiniCard>

      {/* Comunidades do usuário */}
      <MiniCard title={`comunidades (${joinedCommunities.length})`} href="/comunidades" linkLabel="ver todas" bg={cardBg}>
        {loadingCommunities ? (
          <Placeholder>carregando...</Placeholder>
        ) : joinedCommunities.length === 0 ? (
          <Placeholder>tá faltando alguma coisa aqui ♡</Placeholder>
        ) : (
          <div className="grid grid-cols-2 gap-2 px-4 py-4">
            {joinedCommunities.map((community) => (
              <Link
                key={community.id}
                href={`/comunidades/${community.slug}`}
                className="block rounded-xl overflow-hidden no-underline transition-opacity hover:opacity-80"
                style={{ border: "1px solid var(--color-border)" }}
              >
                <div className="h-11 overflow-hidden">
                  <img src={community.coverImageUrl} alt={community.name} className="w-full h-full object-cover" />
                </div>
                <div className="px-2 py-1.5">
                  <span className="text-[11px] font-black block truncate" style={{ color: "#1976c9" }}>
                    {community.name}
                  </span>
                  <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                    {community._count.members} membros
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </MiniCard>

      {/* Sugestões de comunidades */}
      {!loadingCommunities && suggestedCommunities.length > 0 && (
        <section
          className="overflow-hidden rounded-[18px] border tece-shadow"
          style={{ background: cardBg, borderColor: "var(--color-border)" }}
        >
          <div
            className="flex h-[60px] items-center px-[26px] font-black text-sm border-b"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
          >
            ✦ comunidades em alta
          </div>
          <div className="grid grid-cols-2 gap-2 px-4 py-4">
            {suggestedCommunities.map((community) => (
              <Link
                key={community.id}
                href={`/comunidades/${community.slug}`}
                className="block rounded-xl overflow-hidden no-underline transition-opacity hover:opacity-80"
                style={{ border: "1px solid rgba(49,213,222,.25)" }}
              >
                <div className="h-11 overflow-hidden">
                  <img src={community.coverImageUrl} alt={community.name} className="w-full h-full object-cover" />
                </div>
                <div className="px-2 py-1.5">
                  <span className="text-[11px] font-black block truncate" style={{ color: "var(--color-tece-500)" }}>
                    {community.name}
                  </span>
                  <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                    {community._count.members} membros
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Atualizações do site */}
      <UpdatesCard updates={updates} loading={loadingUpdates} bg={cardBg} onUpdate={setUpdates} />

    </div>
    </aside>
  );
}

function UpdatesCard({
  updates, loading, bg, onUpdate,
}: {
  updates: SiteUpdate[];
  loading: boolean;
  bg: string;
  onUpdate: (updates: SiteUpdate[]) => void;
}) {
  const [toggling, setToggling] = useState<string | null>(null);

  async function handleLike(update: SiteUpdate) {
    if (toggling) return;
    setToggling(update.id);
    const wasLiked = update.likedByMe;

    onUpdate(
      updates.map((u) =>
        u.id === update.id
          ? { ...u, likedByMe: !wasLiked, likeCount: u.likeCount + (wasLiked ? -1 : 1) }
          : u
      )
    );

    try {
      await fetch(`/api/updates/${update.id}/like`, { method: wasLiked ? "DELETE" : "POST" });
    } catch {
      onUpdate(
        updates.map((u) =>
          u.id === update.id
            ? { ...u, likedByMe: wasLiked, likeCount: u.likeCount }
            : u
        )
      );
    } finally {
      setToggling(null);
    }
  }

  return (
    <section
      className="overflow-hidden rounded-[18px] border tece-shadow"
      style={{ background: bg, borderColor: "var(--color-border)" }}
    >
      <div
        className="flex h-[60px] items-center gap-2 px-[26px] font-black text-sm border-b"
        style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
      >
        <IconUpdates />
        atualizações do tecê
      </div>

      {loading ? (
        <Placeholder>carregando...</Placeholder>
      ) : updates.length === 0 ? (
        <Placeholder>nenhuma atualização ainda.</Placeholder>
      ) : (
        <div
          className="flex flex-col divide-y overflow-y-auto"
          style={{ borderColor: "var(--color-border)", maxHeight: 340 }}
        >
          {updates.map((update) => {
            const meta = typeLabel[update.type];
            return (
              <div key={update.id} className="px-5 py-3 flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] font-black px-2 py-0.5 rounded-full"
                    style={{ background: meta.bg, color: meta.color }}
                  >
                    {meta.label}
                  </span>
                  <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                    {new Date(update.createdAt).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}
                  </span>
                </div>
                <p className="text-xs leading-relaxed m-0 whitespace-pre-wrap" style={{ color: "var(--color-text)" }}>
                  {update.content}
                </p>
                <button
                  onClick={() => handleLike(update)}
                  className="flex items-center gap-1 text-xs w-fit transition-colors"
                  style={{ color: update.likedByMe ? "#e63946" : "var(--color-text-muted)" }}
                >
                  <span style={{ fontSize: "0.95rem" }}>{update.likedByMe ? "♥" : "♡"}</span>
                  {update.likeCount > 0 && <span>{update.likeCount}</span>}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function FriendAvatar({ friend }: { friend: Friend }) {
  const ringColor = {
    online: "#22c55e",
    busy: "#f87171",
    away: "#fbbf24",
    offline: "#9ca3af",
  }[friend.presenceStatus];
  return (
    <Link href={`/perfil/${friend.username}`} className="min-w-0 text-center no-underline">
      <div className="mx-auto rounded-full p-[3px]" style={{ background: ringColor, width: 54, height: 54 }}>
        <div
          className="h-full w-full rounded-full overflow-hidden grid place-items-center text-sm font-black"
          style={{
            background: friend.gender === "M" ? "rgba(253,101,160,.2)" : "rgba(49,213,222,.2)",
            color: friend.gender === "M" ? "var(--color-tece-pink)" : "var(--color-tece-blue)",
          }}
        >
          {friend.profileImageUrl ? (
            <img src={friend.profileImageUrl} alt={friend.username} className="h-full w-full object-cover" />
          ) : (
            friend.username[0].toUpperCase()
          )}
        </div>
      </div>
      <span className="mt-1 block truncate text-xs font-black" style={{ color: "#008c9a" }}>
        @{friend.username}
      </span>
    </Link>
  );
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid h-[100px] place-items-center px-5 text-center font-bold" style={{ color: "var(--color-text)" }}>
      {children}
    </div>
  );
}

function IconUpdates() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="8" cy="8" r="7" stroke="#f59e0b" strokeWidth="1.4" fill="#f59e0b" fillOpacity=".12"/>
      <path d="M8 4v4l2.5 2.5" stroke="#f59e0b" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function MiniCard({
  title, href, linkLabel, bg, children,
}: {
  title: string;
  href: string;
  linkLabel: string;
  bg: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="min-h-[150px] overflow-hidden rounded-[18px] border tece-shadow"
      style={{ background: bg, borderColor: "var(--color-border)" }}
    >
      <div
        className="flex h-[70px] items-center justify-between border-b px-[26px] font-black"
        style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
      >
        <span>{title}</span>
        <Link href={href} className="text-sm no-underline" style={{ color: "var(--color-tece-500)" }}>
          {linkLabel}
        </Link>
      </div>
      {children}
    </section>
  );
}
