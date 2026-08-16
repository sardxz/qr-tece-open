import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import type { PresenceStatus } from "@/types";

type Params = { params: Promise<{ username: string }> };

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;

export async function GET(_req: NextRequest, { params }: Params) {
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
      _count: { select: { invitedUsers: true } },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  }

  const isOwnProfile = session?.username === username;

  const [friendship, pendingDeposCount, deposCount, badgesCount, communitiesCount, likesReceived, friendsCount] =
    await Promise.all([
      !isOwnProfile && session
        ? prisma.friendship.findFirst({
            where: {
              OR: [
                { requesterId: session.sub, receiverId: user.id },
                { requesterId: user.id, receiverId: session.sub },
              ],
            },
            select: { id: true, status: true, requesterId: true },
          })
        : Promise.resolve(null),

      isOwnProfile
        ? prisma.depo.count({ where: { recipientId: user.id, status: "PENDING" } })
        : Promise.resolve(0),

      prisma.depo.count({ where: { recipientId: user.id, status: "APPROVED" } }),

      prisma.showcaseItem.count({ where: { userId: user.id, type: "BADGE" } }),

      prisma.communityMember.count({ where: { userId: user.id } }),

      prisma.like.count({ where: { post: { authorId: user.id } } }),

      prisma.friendship.count({
        where: {
          status: "ACCEPTED",
          OR: [{ requesterId: user.id }, { receiverId: user.id }],
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
    Date.now() - user.lastActiveAt.getTime() < ONLINE_THRESHOLD_MS;

  const presenceStatus: PresenceStatus =
    !autoOnline ? "offline" :
    user.manualStatus === "BUSY" ? "busy" :
    user.manualStatus === "AWAY" ? "away" :
    user.manualStatus === "OFFLINE" ? "offline" :
    "online";

  return NextResponse.json({
    user: {
      id: user.id,
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
      reputationScore: user.reputationScore,
      statusText: user.statusText,
      invitedBy: user.invitedBy,
      invitedUsersCount: user._count.invitedUsers,
    },
    stats: {
      depos: deposCount,
      badges: badgesCount,
      communities: communitiesCount,
      likesReceived,
      friends: friendsCount,
    },
    presenceStatus,
    isOwnProfile,
    friendState,
    pendingDeposCount,
  });
}
