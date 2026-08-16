import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import NewPostForm from "@/components/feed/NewPostForm";
import HomeFeed from "@/components/feed/HomeFeed";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const session = await getSession();

  const posts = await prisma.post.findMany({
    where: { communityId: null, replyToId: null },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      author: { select: { id: true, username: true, profileImageUrl: true, gender: true } },
      community: { select: { id: true, name: true, slug: true } },
      replyTo: { include: { author: { select: { id: true, username: true } } } },
      _count: { select: { likes: true, replies: true } },
      likes: { where: { userId: session?.sub ?? "" } },
    },
  });

  const serialized = posts.map((post) => ({
    id: post.id,
    content: post.content,
    imageUrl: post.imageUrl ?? null,
    createdAt: post.createdAt.toISOString(),
    author: post.author,
    community: post.community ?? null,
    replyTo: post.replyTo
      ? { id: post.replyTo.id, content: post.replyTo.content, author: post.replyTo.author }
      : null,
    _count: { likes: post._count.likes, comments: post._count.replies },
    likedByMe: Array.isArray(post.likes) && post.likes.length > 0,
  }));

  return (
    <div>
      <div>
        <h1 className="m-0 text-[32px] font-black leading-tight" style={{ color: "var(--color-text)" }}>
          feed
        </h1>
        <p className="mt-1 text-[17px] font-bold" style={{ color: "var(--color-text-muted)" }}>
          o que está acontecendo agora
        </p>
      </div>

      {session && <NewPostForm authorId={session.sub} username={session.username} isAdmin={session.role === "ADMIN"} />}

      <div className="my-9 flex items-center gap-8" style={{ color: "var(--color-tece-cyan)" }}>
        <div className="h-px flex-1" style={{ background: "#dde4ea" }} />
        <span>✦</span>
        <div className="h-px flex-1" style={{ background: "#dde4ea" }} />
      </div>

      <HomeFeed
        initialPosts={serialized}
        currentUserId={session?.sub}
        currentUsername={session?.username}
      />
    </div>
  );
}
