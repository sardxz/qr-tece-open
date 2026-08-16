import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/layout/Sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/home");

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      username: true,
      gender: true,
      bio: true,
      profilePhrase: true,
      profileImageUrl: true,
      city: true,
      state: true,
      birthYear: true,
      lastSeenMentionsAt: true,
      manualStatus: true,
      reputationScore: true,
      _count: { select: { receivedDepos: true, communities: true, posts: { where: { communityId: null } } } },
    },
  });

  const lastSeen = user?.lastSeenMentionsAt;
  const dateFilter = lastSeen ? { createdAt: { gt: lastSeen } } : {};

  const [friendsCount, mentionsCount, commentsCount, deposNewCount, friendRequestsCount] = await Promise.all([
    prisma.friendship.count({
      where: {
        status: "ACCEPTED",
        OR: [{ requesterId: session.sub }, { receiverId: session.sub }],
      },
    }),
    prisma.post.count({
      where: {
        communityId: { not: null },
        authorId: { not: session.sub },
        content: { contains: `@${session.username}`, mode: "insensitive" },
        ...dateFilter,
      },
    }),
    prisma.comment.count({
      where: { post: { authorId: session.sub }, authorId: { not: session.sub }, ...dateFilter },
    }),
    prisma.depo.count({
      where: { recipientId: session.sub, ...dateFilter },
    }),
    prisma.friendship.count({
      where: { receiverId: session.sub, status: "PENDING", ...dateFilter },
    }),
  ]);

  const activityCount = mentionsCount + commentsCount + deposNewCount + friendRequestsCount;

  if (!user) redirect("/api/auth/clear");

  return (
    <div className="admin-shell">
      <Sidebar
        user={{
          username: user.username,
          gender: user.gender,
          bio: user.bio,
          profilePhrase: user.profilePhrase,
          profileImageUrl: user.profileImageUrl,
          city: user.city,
          state: user.state,
          birthYear: user.birthYear,
          postsCount: user._count.posts,
          communitiesCount: user._count.communities,
          deposCount: user._count.receivedDepos,
          friendsCount,
          activityCount,
          manualStatus: user.manualStatus ?? null,
          reputationScore: user.reputationScore,
        }}
      />
      <main className="admin-main">
        <div className="admin-content">{children}</div>
      </main>
    </div>
  );
}
