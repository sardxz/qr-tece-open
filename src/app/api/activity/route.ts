import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { lastSeenMentionsAt: true },
  });

  const lastSeen = user?.lastSeenMentionsAt ?? null;

  const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const mentionRegex = new RegExp(
    `@${escapeRegex(session.username)}(?![a-zA-Z0-9_])`,
    "i"
  );

  const [mencoesCandidates, comments, depos, friendRequests, likes] = await Promise.all([
    prisma.post.findMany({
      where: {
        authorId: { not: session.sub },
        content: { contains: `@${session.username}`, mode: "insensitive" },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        content: true,
        createdAt: true,
        author: { select: { username: true, profileImageUrl: true, gender: true } },
        community: { select: { name: true, slug: true } },
      },
    }),
    prisma.post.findMany({
      where: {
        replyToId: { not: null },
        replyTo: { authorId: session.sub },
        authorId: { not: session.sub },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        content: true,
        createdAt: true,
        author: { select: { username: true, profileImageUrl: true, gender: true } },
        replyTo: { select: { id: true, content: true } },
      },
    }),
    prisma.depo.findMany({
      where: {
        recipientId: session.sub,
        status: { in: ["PENDING", "APPROVED"] },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        content: true,
        status: true,
        createdAt: true,
        author: { select: { username: true, profileImageUrl: true, gender: true } },
      },
    }),
    prisma.friendship.findMany({
      where: { receiverId: session.sub, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        requester: { select: { username: true, profileImageUrl: true, gender: true } },
      },
    }),
    prisma.like.findMany({
      where: {
        post: { authorId: session.sub },
        userId: { not: session.sub },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        userId: true,
        postId: true,
        createdAt: true,
        user: { select: { username: true, profileImageUrl: true, gender: true } },
        post: { select: { id: true, content: true } },
      },
    }),
  ]);

  // dedup: se o post de menção também é um comentário (replyToId do user), prefere o tipo comment
  const commentPostIds = new Set(comments.map((c) => c.id));
  const mencoes = mencoesCandidates.filter(
    (p) => mentionRegex.test(p.content) && !commentPostIds.has(p.id)
  );

  type ActivityItem =
    | { type: "mention"; id: string; date: string; isNew: boolean; post: { id: string; content: string; author: typeof mencoes[number]["author"]; community: typeof mencoes[number]["community"] } }
    | { type: "comment"; id: string; date: string; isNew: boolean; reply: { id: string; content: string; author: typeof comments[number]["author"] }; parent: { id: string; content: string } }
    | { type: "depo"; id: string; date: string; isNew: boolean; depo: { id: string; content: string; status: string; author: typeof depos[number]["author"] } }
    | { type: "friendRequest"; id: string; date: string; isNew: boolean; friendshipId: string; requester: typeof friendRequests[number]["requester"] }
    | { type: "like"; id: string; date: string; isNew: boolean; user: typeof likes[number]["user"]; post: { id: string; content: string } };

  const isNew = (date: Date) => (lastSeen ? date > lastSeen : false);

  const items: ActivityItem[] = [
    ...mencoes.map((p) => ({
      type: "mention" as const,
      id: `mention-${p.id}`,
      date: p.createdAt.toISOString(),
      isNew: isNew(p.createdAt),
      post: {
        id: p.id,
        content: p.content,
        author: p.author,
        community: p.community,
      },
    })),
    ...comments.map((c) => ({
      type: "comment" as const,
      id: `comment-${c.id}`,
      date: c.createdAt.toISOString(),
      isNew: isNew(c.createdAt),
      reply: { id: c.id, content: c.content, author: c.author },
      parent: { id: c.replyTo!.id, content: c.replyTo!.content },
    })),
    ...depos.map((d) => ({
      type: "depo" as const,
      id: `depo-${d.id}`,
      date: d.createdAt.toISOString(),
      isNew: isNew(d.createdAt),
      depo: {
        id: d.id,
        content: d.content,
        status: d.status,
        author: d.author,
      },
    })),
    ...friendRequests.map((f) => ({
      type: "friendRequest" as const,
      id: `fr-${f.id}`,
      date: f.createdAt.toISOString(),
      isNew: isNew(f.createdAt),
      friendshipId: f.id,
      requester: f.requester,
    })),
    ...likes.map((l) => ({
      type: "like" as const,
      id: `like-${l.userId}-${l.postId}`,
      date: l.createdAt.toISOString(),
      isNew: isNew(l.createdAt),
      user: l.user,
      post: { id: l.post.id, content: l.post.content },
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const totalNew = items.filter((i) => i.isNew).length;

  return NextResponse.json({
    items,
    lastSeen: lastSeen?.toISOString() ?? null,
    totalNew,
  });
}
