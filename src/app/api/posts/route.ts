import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createPostSchema } from "@/lib/validations";
import { rateLimit, peekRateLimit, consumeOnce, msUntilMidnight } from "@/lib/rate-limit";
import { sendPushToUser, sendPushToUsers } from "@/lib/push";
import { canShareLinks } from "@/lib/reputation";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const communityId = searchParams.get("communityId");

  const session = await getSession();

  if (communityId) {
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    const member = await prisma.communityMember.findUnique({
      where: { userId_communityId: { userId: session.sub, communityId } },
    });
    if (!member) {
      return NextResponse.json({ error: "Você não é membro desta comunidade" }, { status: 403 });
    }
  }

  const posts = await prisma.post.findMany({
    where: communityId
      ? { communityId }
      : { communityId: null, replyToId: null },
    orderBy: { createdAt: "desc" },
    take: 20,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    include: {
      author: { select: { id: true, username: true, profileImageUrl: true, gender: true } },
      community: { select: { id: true, name: true, slug: true } },
      replyTo: { select: { id: true, content: true, author: { select: { id: true, username: true } } } },
      repostOf: {
        include: {
          author: { select: { id: true, username: true, profileImageUrl: true, gender: true } },
          community: { select: { id: true, name: true, slug: true } },
          _count: { select: { likes: true, replies: true, reposts: true } },
        },
      },
      _count: { select: { likes: true, replies: true, reposts: true } },
      likes: { where: { userId: session?.sub ?? "" } },
      reposts: { where: { authorId: session?.sub ?? "" }, select: { id: true } },
    },
  });

  const nextCursor = posts.length === 20 ? posts[posts.length - 1].id : null;

  return NextResponse.json({
    posts: posts.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      likedByMe: Array.isArray(p.likes) && p.likes.length > 0,
      repostedByMe: Array.isArray(p.reposts) && p.reposts.length > 0,
      likes: undefined,
      reposts: undefined,
      replyTo: p.replyTo ?? null,
      repostOf: p.repostOf
        ? {
            ...p.repostOf,
            createdAt: p.repostOf.createdAt.toISOString(),
            updatedAt: p.repostOf.updatedAt.toISOString(),
            _count: {
              likes: p.repostOf._count.likes,
              comments: p.repostOf._count.replies,
              reposts: p.repostOf._count.reposts,
            },
          }
        : null,
      _count: { likes: p._count.likes, comments: p._count.replies, reposts: p._count.reposts },
    })),
    nextCursor,
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const { allowed } = rateLimit(`post:${session.sub}:${ip}`, 10, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Muitos posts. Aguarde um momento." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }

  const parsed = createPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { content, communityId, replyToId, imageUrl } = parsed.data;

  if (imageUrl && session.role !== "ADMIN") {
    if (!peekRateLimit(`post-image:${session.sub}`, 1)) {
      return NextResponse.json({ error: "Limite de 1 foto por dia atingido." }, { status: 429 });
    }
  }

  const hasLink = /https?:\/\/|www\.|[a-z0-9-]+\.(com|net|org|br|io|co|app|dev|info|biz)(\/|\s|$)/i.test(content);
  if (hasLink && session.role !== "ADMIN") {
    const author = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { reputationScore: true },
    });
    if (!author || !canShareLinks(author.reputationScore)) {
      return NextResponse.json(
        { error: "Seu score precisa ser pelo menos 200 para compartilhar links." },
        { status: 403 }
      );
    }
  }

  if (communityId) {
    const member = await prisma.communityMember.findUnique({
      where: { userId_communityId: { userId: session.sub, communityId } },
    });
    if (!member) {
      return NextResponse.json(
        { error: "Você não é membro desta comunidade" },
        { status: 403 }
      );
    }
  }

  let post;
  try {
    post = await prisma.post.create({
      data: { content, imageUrl: imageUrl ?? null, authorId: session.sub, communityId: communityId ?? null, replyToId: replyToId ?? null },
      include: {
        author: { select: { id: true, username: true, profileImageUrl: true, gender: true } },
        community: { select: { id: true, name: true, slug: true } },
        replyTo: { select: { id: true, content: true, author: { select: { id: true, username: true } } } },
        _count: { select: { likes: true, replies: true } },
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/posts] Prisma error:", msg);
    return NextResponse.json({ error: msg.slice(0, 300) }, { status: 500 });
  }

  if (imageUrl && session.role !== "ADMIN") {
    consumeOnce(`post-image:${session.sub}`, msUntilMidnight());
  }

  // Push: notifica o author do post pai quando é uma reply
  if (post.replyToId && post.replyTo) {
    const parentAuthor = await prisma.post.findUnique({
      where: { id: post.replyToId },
      select: { authorId: true },
    });
    if (parentAuthor && parentAuthor.authorId !== session.sub) {
      await sendPushToUser(parentAuthor.authorId, {
        title: "Novo comentário",
        body: `@${session.username} comentou no seu post.`,
        data: { type: "comment", postId: post.replyToId, replyId: post.id },
      });
    }
  }

  // Push: notificações de posts top-level
  if (!post.replyToId) {
    // Guarda quem já recebeu notificação por menção, para não receber de novo
    // pelo aviso de "conteúdo novo na comu".
    const mentionedIds = new Set<string>();

    // Notifica usuários mencionados (@username)
    const mentionMatches = content.match(/@([a-z0-9_]+)/gi);
    if (mentionMatches && mentionMatches.length > 0) {
      const usernames = Array.from(new Set(mentionMatches.map((m) => m.slice(1).toLowerCase())));
      const mentioned = await prisma.user.findMany({
        where: { username: { in: usernames }, isActive: true, id: { not: session.sub } },
        select: { id: true },
      });
      await Promise.all(
        mentioned.map((u) => {
          mentionedIds.add(u.id);
          return sendPushToUser(u.id, {
            title: "Você foi mencionado",
            body: `@${session.username} te mencionou num post.`,
            data: { type: "mention", postId: post.id },
          });
        })
      );
    }

    // Notifica os membros da comu sobre conteúdo novo (menos o autor e quem já
    // foi mencionado), respeitando a preferência de cada membro.
    if (post.communityId && post.community) {
      const members = await prisma.communityMember.findMany({
        where: {
          communityId: post.communityId,
          notifyNewPosts: true,
          userId: { not: session.sub },
        },
        select: { userId: true },
      });
      const recipientIds = members
        .map((m) => m.userId)
        .filter((id) => !mentionedIds.has(id));

      if (recipientIds.length > 0) {
        const clean = content.replace(/\s+/g, " ").trim();
        const preview = clean.length > 80 ? `${clean.slice(0, 80).trimEnd()}…` : clean;
        await sendPushToUsers(recipientIds, {
          title: post.community.name,
          body: `@${session.username}: ${preview}`,
          data: {
            type: "community_post",
            postId: post.id,
            communityId: post.communityId,
            communitySlug: post.community.slug,
            communityName: post.community.name,
          },
        });
      }
    }
  }

  return NextResponse.json(
    {
      ...post,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
      likedByMe: false,
      replyTo: post.replyTo ?? null,
      _count: { likes: post._count.likes, comments: post._count.replies },
    },
    { status: 201 }
  );
}
