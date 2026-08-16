import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ProfileCollection from "@/components/profile/ProfileCollection";
import ProfileCommunities from "@/components/profile/ProfileCommunities";
import ProfileHeader from "@/components/profile/ProfileHeader";
import type { PresenceStatus } from "@/types";
import ProfileShowcase from "@/components/profile/ProfileShowcase";
import ProfileTimeline from "@/components/profile/ProfileTimeline";
import ProfileTopFriends from "@/components/profile/ProfileTopFriends";
import ProfileDepos from "@/components/profile/ProfileDepos";

type Props = { params: Promise<{ username: string }> };

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;
  const session = await getSession();

  const user = await prisma.user.findUnique({
    where: { username, isActive: true },
    select: {
      id: true,
      username: true,
      profilePhrase: true,
      bio: true,
      city: true,
      state: true,
      birthYear: true,
      createdAt: true,
      gender: true,
      profileImageUrl: true,
      profileCoverUrl: true,
      reputationScore: true,
      statusText: true,
      manualStatus: true,
      lastActiveAt: true,
      invitedBy: {
        select: {
          username: true,
          gender: true,
          profileImageUrl: true,
          reputationScore: true,
        },
      },
      _count: {
        select: {
          invitedUsers: true,
        },
      },
      receivedDepos: {
        where: { status: "APPROVED" },
        orderBy: { approvedAt: "desc" },
        select: {
          id: true,
          content: true,
          createdAt: true,
          author: { select: { username: true, profileImageUrl: true, gender: true } },
        },
      },
      communities: {
        select: {
          joinedAt: true,
          community: { select: { id: true, name: true, slug: true } },
        },
      },
      createdCommunities: {
        select: { id: true, name: true, slug: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!user) notFound();

  const isOwnProfile = session?.username === username;

  const allShowcaseItems = await prisma.showcaseItem.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      type: true,
      name: true,
      iconUrl: true,
      rarity: true,
      position: true,
      editionNumber: true,
      totalSupply: true,
    },
  });

  const [friendship, pendingDeposCount, likesReceived, friendsCount, acceptedFriendships] = await Promise.all([
    !isOwnProfile && session
      ? prisma.friendship.findFirst({
          where: {
            OR: [
              { requesterId: session.sub, receiverId: user.id },
              { requesterId: user.id, receiverId: session.sub },
            ],
          },
        })
      : Promise.resolve(null),

    isOwnProfile
      ? prisma.depo.count({ where: { recipientId: user.id, status: "PENDING" } })
      : Promise.resolve(0),

    prisma.like.count({ where: { post: { authorId: user.id } } }),

    prisma.friendship.count({
      where: {
        status: "ACCEPTED",
        OR: [{ requesterId: user.id }, { receiverId: user.id }],
      },
    }),

    prisma.friendship.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ requesterId: user.id }, { receiverId: user.id }],
      },
      orderBy: { createdAt: "asc" },
      take: 8,
      include: {
        requester: { select: { id: true, username: true, gender: true, profileImageUrl: true } },
        receiver: { select: { id: true, username: true, gender: true, profileImageUrl: true } },
      },
    }),
  ]);

  type FriendState =
    | { type: "none" }
    | { type: "sent"; id: string }
    | { type: "received"; id: string }
    | { type: "friends"; id: string };

  const friendState: FriendState = !friendship
    ? { type: "none" }
    : friendship.status === "ACCEPTED"
      ? { type: "friends", id: friendship.id }
      : friendship.requesterId === session?.sub
        ? { type: "sent", id: friendship.id }
        : { type: "received", id: friendship.id };

  const autoOnline =
    !!user.lastActiveAt &&
    new Date().getTime() - new Date(user.lastActiveAt).getTime() < 5 * 60 * 1000;

  const presenceStatus: PresenceStatus =
    !autoOnline ? "offline" :
    user.manualStatus === "BUSY" ? "busy" :
    user.manualStatus === "AWAY" ? "away" :
    user.manualStatus === "OFFLINE" ? "offline" :
    "online";

  const stats = {
    depos: user.receivedDepos.length,
    badges: allShowcaseItems.filter((item) => item.type === "BADGE").length,
    communities: user.communities.length,
    likesReceived,
    friends: friendsCount,
  };

  const showcaseItems = allShowcaseItems
    .filter((item) => item.position !== null)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((item) => ({
      id: item.id,
      type: item.type.toLowerCase() as "badge" | "collectible" | "community",
      name: item.name,
      icon: item.iconUrl,
      rarity: (item.rarity ?? "common") as "common" | "rare" | "epic" | "legendary",
      editionNumber: item.editionNumber,
      totalSupply: item.totalSupply,
    }));

  const toCollectionItem = (item: (typeof allShowcaseItems)[number]) => ({
    id: item.id,
    name: item.name,
    icon: item.iconUrl,
    rarity: (item.rarity ?? "common") as "common" | "rare" | "epic" | "legendary",
    editionNumber: item.editionNumber,
    totalSupply: item.totalSupply,
  });

  const showcaseCollectionItems = allShowcaseItems.map(toCollectionItem);

  const collectionByType = {
    badges: allShowcaseItems.filter((item) => item.type === "BADGE").map(toCollectionItem),
    mascotes: allShowcaseItems.filter((item) => item.type === "MASCOT").map(toCollectionItem),
    itens: allShowcaseItems.filter((item) => item.type === "ITEM").map(toCollectionItem),
    eventos: allShowcaseItems.filter((item) => item.type === "EVENT").map(toCollectionItem),
    especiais: allShowcaseItems.filter((item) => item.type === "SPECIAL").map(toCollectionItem),
  };

  const topFriends = acceptedFriendships.map((friendshipItem) => {
    const friend =
      friendshipItem.requesterId === user.id ? friendshipItem.receiver : friendshipItem.requester;

    return {
      id: friend.id,
      username: friend.username,
      gender: friend.gender,
      profileImageUrl: friend.profileImageUrl,
      friendsSince: friendshipItem.createdAt.toISOString(),
    };
  });

  const firstDepo = user.receivedDepos[user.receivedDepos.length - 1];

  const timelineEvents = [
    {
      id: "joined",
      icon: "◉",
      description: "Entrou no Tece",
      date: user.createdAt.toISOString(),
      iconColor: "#4ade80",
      iconBg: "rgba(34,197,94,.16)",
    },
    ...user.createdCommunities.map((community) => ({
      id: `created-community-${community.id}`,
      icon: "▣",
      description: `Criou comunidade "${community.name}"`,
      date: community.createdAt.toISOString(),
      iconColor: "#22d3ee",
      iconBg: "rgba(49,213,222,.14)",
    })),
    ...user.communities.map(({ community, joinedAt }) => ({
      id: `joined-community-${community.id}`,
      icon: "✦",
      description: `Entrou na comunidade "${community.name}"`,
      date: joinedAt.toISOString(),
      iconColor: "#a78bfa",
      iconBg: "rgba(167,139,250,.14)",
    })),
    ...(firstDepo
      ? [
          {
            id: `first-depo-${firstDepo.id}`,
            icon: "✉",
            description: "Recebeu seu primeiro depo",
            date: firstDepo.createdAt.toISOString(),
            iconColor: "#f59e0b",
            iconBg: "rgba(245,158,11,.15)",
          },
        ]
      : []),
    ...acceptedFriendships.slice(0, 2).map((friendshipItem) => {
      const friend =
        friendshipItem.requesterId === user.id ? friendshipItem.receiver : friendshipItem.requester;

      return {
        id: `friendship-${friendshipItem.id}`,
        icon: "♥",
        description: `Virou amigo de @${friend.username}`,
        date: friendshipItem.createdAt.toISOString(),
        iconColor: "#fb7185",
        iconBg: "rgba(251,113,133,.15)",
      };
    }),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="min-w-0 flex flex-col gap-4">
      <ProfileHeader
        user={{
          username: user.username,
          profilePhrase: user.profilePhrase,
          bio: user.bio,
          city: user.city,
          state: user.state,
          birthYear: user.birthYear,
          createdAt: user.createdAt.toISOString(),
          gender: user.gender,
          profileImageUrl: user.profileImageUrl,
          profileCoverUrl: user.profileCoverUrl,
          statusText: user.statusText,
          reputationScore: user.reputationScore,
          invitedBy: user.invitedBy,
          invitedUsersCount: user._count.invitedUsers,
        }}
        stats={stats}
        presenceStatus={presenceStatus}
        isOwnProfile={isOwnProfile}
        friendState={friendState}
      />

      <div id="depos" className="scroll-mt-24">
        <ProfileDepos key={user.username} username={user.username} />
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 min-[1400px]:grid-cols-2 min-[1800px]:grid-cols-3">
        <ProfileShowcase
          items={showcaseItems}
          collectionItems={showcaseCollectionItems}
          isOwnProfile={isOwnProfile}
        />
        <ProfileCommunities
          username={user.username}
          communities={user.communities.map(({ community }) => ({
            id: community.id,
            name: community.name,
            slug: community.slug,
          }))}
        />
        <ProfileTopFriends username={user.username} friends={topFriends} isOwnProfile={isOwnProfile} />
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 min-[1500px]:grid-cols-2">
        <ProfileCollection itemsByTab={collectionByType} />
        <ProfileTimeline events={timelineEvents} />
      </div>

      {isOwnProfile && pendingDeposCount > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>
              você tem {pendingDeposCount} depo{pendingDeposCount > 1 ? "s" : ""} aguardando aprovação.
            </p>
            <Link
              href="/depos/recebidos"
              className="text-xs font-semibold transition-opacity hover:opacity-80"
              style={{ color: "var(--color-tece-500)" }}
            >
              revisar agora
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
