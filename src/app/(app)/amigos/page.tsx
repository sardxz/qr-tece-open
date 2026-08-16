import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import FriendActions from "@/components/friends/FriendActions";

export const dynamic = "force-dynamic";

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;

const presenceColors: Record<string, string> = {
  online: "#22c55e",
  busy: "#f97316",
  away: "#eab308",
  offline: "#6b7280",
};

export default async function AmigosPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [pendentes, friendships] = await Promise.all([
    prisma.friendship.findMany({
      where: { receiverId: session.sub, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: {
        requester: {
          select: { id: true, username: true, gender: true, profileImageUrl: true },
        },
      },
    }),
    prisma.friendship.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ requesterId: session.sub }, { receiverId: session.sub }],
      },
      orderBy: { createdAt: "desc" },
      include: {
        requester: {
          select: {
            id: true, username: true, gender: true, profileImageUrl: true,
            bio: true, profilePhrase: true, city: true, state: true,
            lastActiveAt: true, manualStatus: true,
          },
        },
        receiver: {
          select: {
            id: true, username: true, gender: true, profileImageUrl: true,
            bio: true, profilePhrase: true, city: true, state: true,
            lastActiveAt: true, manualStatus: true,
          },
        },
      },
    }),
  ]);

  const now = Date.now();

  const amigos = friendships.map((f) => {
    const u = f.requesterId === session.sub ? f.receiver : f.requester;
    const autoOnline = !!u.lastActiveAt && now - u.lastActiveAt.getTime() < ONLINE_THRESHOLD_MS;
    const presenceStatus =
      !autoOnline ? "offline" :
      u.manualStatus === "BUSY" ? "busy" :
      u.manualStatus === "AWAY" ? "away" :
      u.manualStatus === "OFFLINE" ? "offline" :
      "online";
    return { ...u, friendshipId: f.id, friendsSince: f.createdAt, presenceStatus };
  });

  const friendIds = amigos.map((a) => a.id);

  const [allMemberships, allFriendshipsOfFriends] = await Promise.all([
    friendIds.length > 0
      ? prisma.communityMember.findMany({
          where: { userId: { in: [session.sub, ...friendIds] } },
          select: {
            userId: true,
            communityId: true,
            community: { select: { name: true, slug: true } },
          },
        })
      : Promise.resolve([]),
    friendIds.length > 0
      ? prisma.friendship.findMany({
          where: {
            status: "ACCEPTED",
            OR: [{ requesterId: { in: friendIds } }, { receiverId: { in: friendIds } }],
          },
          select: { requesterId: true, receiverId: true },
        })
      : Promise.resolve([]),
  ]);

  const myCommIds = new Set(
    allMemberships.filter((m) => m.userId === session.sub).map((m) => m.communityId)
  );
  const commInfoById = new Map(allMemberships.map((m) => [m.communityId, m.community]));
  const myFriendIds = new Set(friendIds);

  const friendsOfFriendMap = new Map<string, Set<string>>();
  for (const f of allFriendshipsOfFriends) {
    for (const [ownerId, otherId] of [
      [f.requesterId, f.receiverId],
      [f.receiverId, f.requesterId],
    ] as [string, string][]) {
      if (myFriendIds.has(ownerId)) {
        if (!friendsOfFriendMap.has(ownerId)) friendsOfFriendMap.set(ownerId, new Set());
        friendsOfFriendMap.get(ownerId)!.add(otherId);
      }
    }
  }

  const amigoCards = amigos.map((amigo) => {
    const friendCommIds = new Set(
      allMemberships.filter((m) => m.userId === amigo.id).map((m) => m.communityId)
    );
    const commonComms = [...friendCommIds]
      .filter((id) => myCommIds.has(id))
      .map((id) => commInfoById.get(id)!)
      .filter(Boolean);

    const theirFriendIds = friendsOfFriendMap.get(amigo.id) ?? new Set<string>();
    const mutualCount = [...theirFriendIds].filter(
      (id) => id !== session.sub && myFriendIds.has(id)
    ).length;

    return { ...amigo, commonComms, mutualCount };
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2
          className="text-xl font-bold"
          style={{ color: "var(--color-text)", fontFamily: "var(--font-display)" }}
        >
          amigos
        </h2>
        <p className="text-sm mt-0.5" style={{ color: "var(--color-text-muted)" }}>
          {amigoCards.length} amigo{amigoCards.length !== 1 ? "s" : ""}
        </p>
      </div>

      {pendentes.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--color-text-muted)" }}>
            pedidos pendentes ({pendentes.length})
          </h3>
          <div className="flex flex-col gap-3">
            {pendentes.map((f) => (
              <div key={f.id} className="flex items-center justify-between gap-3 flex-wrap">
                <Link href={`/perfil/${f.requester.username}`} className="flex items-center gap-3 min-w-0">
                  <ProfilePhoto
                    username={f.requester.username}
                    gender={f.requester.gender}
                    imageUrl={f.requester.profileImageUrl}
                    size={36}
                  />
                  <span className="text-sm font-semibold truncate" style={{ color: "var(--color-text)" }}>
                    @{f.requester.username}
                  </span>
                </Link>
                <FriendActions friendshipId={f.id} mode="respond" />
              </div>
            ))}
          </div>
        </div>
      )}

      {amigoCards.length === 0 ? (
        <div className="card p-6 text-center">
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            Nenhum amigo ainda. Visite perfis e adicione pessoas!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {amigoCards.map((amigo) => (
            <FriendCard key={amigo.id} amigo={amigo} />
          ))}
        </div>
      )}
    </div>
  );
}

type AmigoCard = {
  id: string;
  username: string;
  gender: string;
  profileImageUrl: string | null;
  bio: string | null;
  profilePhrase: string | null;
  city: string | null;
  state: string | null;
  friendshipId: string;
  friendsSince: Date;
  presenceStatus: string;
  commonComms: { name: string; slug: string }[];
  mutualCount: number;
};

function FriendCard({ amigo }: { amigo: AmigoCard }) {
  const tagline = amigo.profilePhrase || amigo.bio;
  const location = [amigo.city, amigo.state].filter(Boolean).join(", ");

  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="relative flex-shrink-0">
          <ProfilePhoto
            username={amigo.username}
            gender={amigo.gender}
            imageUrl={amigo.profileImageUrl}
            size={48}
          />
          <span
            className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2"
            style={{
              background: presenceColors[amigo.presenceStatus] ?? presenceColors.offline,
              borderColor: "var(--color-card)",
            }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <Link
            href={`/perfil/${amigo.username}`}
            className="text-sm font-bold hover:underline block truncate"
            style={{ color: "var(--color-text)" }}
          >
            @{amigo.username}
          </Link>
          {location && (
            <p className="text-xs truncate mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              {location}
            </p>
          )}
        </div>
      </div>

      {tagline && (
        <p
          className="text-xs italic line-clamp-2 leading-relaxed"
          style={{ color: "var(--color-text-muted)" }}
        >
          &ldquo;{tagline}&rdquo;
        </p>
      )}

      <div style={{ height: 1, background: "var(--color-border)" }} />

      <div className="flex flex-col gap-1.5 flex-1">
        {amigo.commonComms.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {amigo.commonComms.slice(0, 3).map((c) => (
              <Link
                key={c.slug}
                href={`/comunidades/${c.slug}`}
                className="text-[10px] px-2 py-0.5 rounded-full font-medium hover:opacity-80 transition-opacity"
                style={{ background: "rgba(49,213,222,.12)", color: "var(--color-tece-blue)" }}
              >
                {c.name}
              </Link>
            ))}
            {amigo.commonComms.length > 3 && (
              <span className="text-[10px] px-1 py-0.5" style={{ color: "var(--color-text-muted)" }}>
                +{amigo.commonComms.length - 3}
              </span>
            )}
          </div>
        )}

        {amigo.commonComms.length === 0 && (
          <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
            nenhuma comunidade em comum
          </p>
        )}

        {amigo.mutualCount > 0 && (
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            {amigo.mutualCount} amigo{amigo.mutualCount !== 1 ? "s" : ""} em comum
          </p>
        )}

        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          amigos desde{" "}
          {new Date(amigo.friendsSince).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })}
        </p>
      </div>

      <div className="flex gap-2 pt-1">
        <Link
          href={`/perfil/${amigo.username}`}
          className="btn-primary text-xs px-3 py-1.5 flex-1 text-center"
        >
          ver perfil
        </Link>
        <FriendActions friendshipId={amigo.friendshipId} mode="unfriend" />
      </div>
    </div>
  );
}

function ProfilePhoto({
  username,
  gender,
  imageUrl,
  size,
}: {
  username: string;
  gender: string;
  imageUrl: string | null;
  size: number;
}) {
  if (imageUrl) {
    return (
      <Image
        src={imageUrl}
        alt={username}
        width={size}
        height={size}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="rounded-full flex items-center justify-center font-bold flex-shrink-0"
      style={{
        width: size,
        height: size,
        fontSize: size >= 40 ? 16 : 13,
        background: gender === "M" ? "rgba(253,101,160,.22)" : "rgba(49,213,222,.18)",
        color: gender === "M" ? "var(--color-tece-pink)" : "var(--color-tece-blue)",
      }}
    >
      {username[0].toUpperCase()}
    </div>
  );
}
