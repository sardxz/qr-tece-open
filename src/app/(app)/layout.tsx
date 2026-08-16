import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/layout/Sidebar";
import RightRail from "@/components/layout/RightRail";
import TopBar from "@/components/layout/TopBar";
import OnlinePing from "@/components/OnlinePing";
import TabTitleUpdater from "@/components/TabTitleUpdater";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

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
      termsAcceptedAt: true,
      _count: { select: { receivedDepos: { where: { status: "APPROVED" } }, communities: true, posts: { where: { communityId: null } } } },
    },
  });

  if (!user) redirect("/api/auth/clear");
  if (!user.termsAcceptedAt) redirect("/aceitar-termos");

  const lastSeen = user?.lastSeenMentionsAt;
  const dateFilter = lastSeen ? { createdAt: { gt: lastSeen } } : {};

  const [friendsCount, mentionsCount, commentsCount, deposNewCount, friendRequestsCount, likesReceivedCount] = await Promise.all([
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
      where: {
        post: { authorId: session.sub },
        authorId: { not: session.sub },
        ...dateFilter,
      },
    }),
    prisma.depo.count({
      where: { recipientId: session.sub, status: "PENDING", ...dateFilter },
    }),
    prisma.friendship.count({
      where: { receiverId: session.sub, status: "PENDING", ...dateFilter },
    }),
    prisma.like.count({
      where: {
        post: { authorId: session.sub },
        userId: { not: session.sub },
        ...dateFilter,
      },
    }),
  ]);

  const activityCount = mentionsCount + commentsCount + deposNewCount + friendRequestsCount + likesReceivedCount;

  return (
    <div className="app-shell">
      <TopBar username={session.username} isAdmin={session.role === "ADMIN"} />
      <div className="app-layout">
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
        <main className="app-main">
          <OnlinePing />
          <TabTitleUpdater count={activityCount} />
          {children}
        </main>
        <RightRail />
      </div>
      <footer className="tece-footer">
        <span>qr.tecê? © 2024</span>
        <span>sobre</span>
        <span>privacidade</span>
        <span>termos</span>
        <span className="max-[900px]:hidden">ajuda</span>
        <span className="tece-footer-right">
          Desenvolvido por{" "}
          <a href="https://noveoito.vercel.app" target="_blank" rel="noopener noreferrer" className="tece-footer-link" style={{ color: "#60a5fa" }}>
            NoveOito Projects
          </a>
        </span>
      </footer>
    </div>
  );
}
