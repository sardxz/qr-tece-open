import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const session = await getSession();
  const { id: postId } = await params;
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");

  const parent = await prisma.post.findUnique({ where: { id: postId } });
  if (!parent) return NextResponse.json({ error: "Post não encontrado" }, { status: 404 });

  const replies = await prisma.post.findMany({
    where: { replyToId: postId },
    orderBy: { createdAt: "desc" },
    take: 50,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    include: {
      author: { select: { id: true, username: true, profileImageUrl: true, gender: true } },
      _count: { select: { likes: true, replies: true } },
      likes: { where: { userId: session?.sub ?? "" } },
    },
  });

  const nextCursor = replies.length === 50 ? replies[replies.length - 1].id : null;

  return NextResponse.json({
    replies: replies.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      likedByMe: r.likes.length > 0,
      likes: undefined,
      _count: { likes: r._count.likes, comments: r._count.replies },
    })),
    nextCursor,
  });
}
