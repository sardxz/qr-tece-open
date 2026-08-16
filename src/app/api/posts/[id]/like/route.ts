import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { sendPushToUser } from "@/lib/push";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { allowed } = rateLimit(`like-post:${session.sub}`, 60, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: "Muitas ações. Aguarde um momento." }, { status: 429 });
  }

  const { id: postId } = await params;

  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) return NextResponse.json({ error: "Post não encontrado" }, { status: 404 });

  const existing = await prisma.like.findUnique({
    where: { userId_postId: { userId: session.sub, postId } },
  });

  if (!existing) {
    await prisma.like.create({ data: { userId: session.sub, postId } });

    if (post.authorId !== session.sub) {
      await sendPushToUser(post.authorId, {
        title: "Novo like",
        body: `@${session.username} curtiu seu post.`,
        data: { type: "like", postId },
      });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id: postId } = await params;

  await prisma.like.deleteMany({
    where: { userId: session.sub, postId },
  });

  return NextResponse.json({ ok: true });
}
