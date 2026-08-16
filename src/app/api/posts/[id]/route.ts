import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canShareLinks } from "@/lib/reputation";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const editSchema = z.object({
  content: z
    .string()
    .min(1, "Post não pode ser vazio")
    .max(1000, "Post muito longo")
    .transform((v) => v.replace(/<[^>]*>/g, "").trim()),
});

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  const { id: postId } = await params;

  const post = await prisma.post.findUnique({
    where: { id: postId },
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

  if (!post) return NextResponse.json({ error: "Post não encontrado" }, { status: 404 });

  return NextResponse.json({
    ...post,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    likedByMe: post.likes.length > 0,
    repostedByMe: post.reposts.length > 0,
    likes: undefined,
    reposts: undefined,
    repostOf: post.repostOf
      ? {
          ...post.repostOf,
          createdAt: post.repostOf.createdAt.toISOString(),
          updatedAt: post.repostOf.updatedAt.toISOString(),
          _count: {
            likes: post.repostOf._count.likes,
            comments: post.repostOf._count.replies,
            reposts: post.repostOf._count.reposts,
          },
        }
      : null,
    _count: { likes: post._count.likes, comments: post._count.replies, reposts: post._count.reposts },
  });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id: postId } = await params;

  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) return NextResponse.json({ error: "Post não encontrado" }, { status: 404 });
  if (post.authorId !== session.sub) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }

  const parsed = editSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { content } = parsed.data;

  const hasLink = /https?:\/\/|www\.|[a-z0-9-]+\.(com|net|org|br|io|co|app|dev|info|biz)(\/|\s|$)/i.test(content);
  if (hasLink && session.role !== "ADMIN") {
    const author = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { reputationScore: true },
    });
    if (!author || !canShareLinks(author.reputationScore)) {
      return NextResponse.json({ error: "Seu score precisa ser pelo menos 200 para compartilhar links." }, { status: 403 });
    }
  }

  const updated = await prisma.post.update({
    where: { id: postId },
    data: { content },
  });

  return NextResponse.json({
    id: updated.id,
    content: updated.content,
    updatedAt: updated.updatedAt.toISOString(),
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id: postId } = await params;

  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) return NextResponse.json({ error: "Post não encontrado" }, { status: 404 });
  if (post.authorId !== session.sub && session.role !== "ADMIN") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  await prisma.$transaction(async (tx) => {
    const replyIds = (
      await tx.post.findMany({ where: { replyToId: postId }, select: { id: true } })
    ).map((r) => r.id);

    if (replyIds.length > 0) {
      await tx.like.deleteMany({ where: { postId: { in: replyIds } } });
      await tx.comment.deleteMany({ where: { postId: { in: replyIds } } });
      await tx.post.deleteMany({ where: { id: { in: replyIds } } });
    }

    await tx.like.deleteMany({ where: { postId } });
    await tx.comment.deleteMany({ where: { postId } });
    await tx.post.delete({ where: { id: postId } });
  });

  return NextResponse.json({ success: true });
}
