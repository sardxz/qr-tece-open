import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import CommunityFeed from "@/components/communities/CommunityFeed";
import JoinButton from "@/components/communities/JoinButton";
import CommunityOwnerMenu from "@/components/communities/CommunityOwnerMenu";

type Props = { params: Promise<{ slug: string }> };

export default async function ComunidadePage({ params }: Props) {
  const { slug } = await params;
  const session = await getSession();

  const community = await prisma.community.findUnique({
    where: { slug },
    include: {
      createdBy: { select: { username: true } },
      _count: { select: { members: true, posts: true } },
    },
  });

  if (!community) notFound();

  const membership = session
    ? await prisma.communityMember.findUnique({
        where: { userId_communityId: { userId: session.sub, communityId: community.id } },
        select: { role: true },
      })
    : null;
  const isMember = !!membership;
  const myRole = membership?.role ?? null;
  const isPrivateNonMember = community.isPrivate && !isMember;

  const posts = isMember
    ? await prisma.post.findMany({
        where: { communityId: community.id },
        orderBy: { createdAt: "desc" },
        take: 30,
        include: {
          author: { select: { id: true, username: true, profileImageUrl: true, gender: true } },
          community: { select: { id: true, name: true, slug: true } },
          _count: { select: { likes: true, comments: true } },
          likes: { where: { userId: session?.sub ?? "" } },
        },
      })
    : [];

  return (
    <div className="flex flex-col gap-4">
      {/* Header da comunidade */}
      <div className="card">
        {/* Capa */}
        <div className="h-[360px] max-[1024px]:h-[260px] max-[900px]:h-[180px] overflow-hidden">
          <img
            src={community.coverImageUrl}
            alt={community.name}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1
                className="text-xl font-bold leading-tight"
                style={{ color: "var(--color-text)", fontFamily: "var(--font-display)" }}
              >
                {community.name}
              </h1>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                {community._count.members} membros · {community._count.posts} posts
              </p>
            </div>
            {session ? (
              community.createdById === session.sub ? (
                <CommunityOwnerMenu
                  slug={slug}
                  initialName={community.name}
                  initialDescription={community.description}
                  initialRules={community.rules}
                  canInvite={community.isPrivate && myRole === "OWNER"}
                />
              ) : session.role === "ADMIN" ? (
                <div className="flex items-center gap-2">
                  {isPrivateNonMember ? (
                    <span className="rounded-full border px-3 py-2 text-sm font-bold" style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}>
                      comunidade fechada
                    </span>
                  ) : (
                    <JoinButton
                      slug={slug}
                      initialMember={isMember}
                      isOwner={false}
                    />
                  )}
                  <CommunityOwnerMenu
                    slug={slug}
                    initialName={community.name}
                    initialDescription={community.description}
                    initialRules={community.rules}
                    canManage={false}
                    canInvite={false}
                  />
                </div>
              ) : isPrivateNonMember ? (
                <span className="rounded-full border px-3 py-2 text-sm font-bold" style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}>
                  comunidade fechada
                </span>
              ) : (
                <JoinButton
                  slug={slug}
                  initialMember={isMember}
                  isOwner={false}
                />
              )
            ) : isPrivateNonMember ? (
              <span className="rounded-full border px-3 py-2 text-sm font-bold" style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}>
                comunidade fechada
              </span>
            ) : null}
          </div>

          {community.description && (
            <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--color-text)" }}>
              {community.description}
            </p>
          )}

          <p className="mt-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
            criada por{" "}
            <a
              href={`/perfil/${community.createdBy.username}`}
              className="font-medium underline"
              style={{ color: "var(--color-tece-600)" }}
            >
              @{community.createdBy.username}
            </a>
          </p>
        </div>
      </div>

      {isMember && (
        <CommunityFeed
          initialPosts={posts.map((post) => ({
            id: post.id,
            content: post.content,
            imageUrl: post.imageUrl ?? null,
            createdAt: post.createdAt.toISOString(),
            author: post.author,
            community: post.community ?? null,
            _count: post._count,
            likedByMe: Array.isArray(post.likes) && post.likes.length > 0,
          }))}
          currentUserId={session?.sub}
          currentUsername={session?.username}
          authorId={session?.sub ?? ""}
          communityId={community.id}
          isMember={isMember}
          isAdmin={session?.role === "ADMIN"}
        />
      )}
    </div>
  );
}
