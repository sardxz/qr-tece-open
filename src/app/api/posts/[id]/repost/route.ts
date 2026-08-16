import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

type Params = { params: Promise<{ id: string }> };

const repostOfInclude = {
  author: { select: { id: true, username: true, profileImageUrl: true, gender: true } },
  community: { select: { id: true, name: true, slug: true } },
  _count: { select: { likes: true, replies: true, reposts: true } },
} as const;

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { allowed } = rateLimit(`repost:${session.sub}`, 20, 60_000);
  if (!allowed) return NextResponse.json({ error: "Muitas ações. Aguarde." }, { status: 429 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }

  const rawContent = typeof (body as { content?: unknown }).content === "string"
    ? ((body as { content: string }).content).trim()
    : "";

  if (!rawContent) return NextResponse.json({ error: "A citação não pode ficar vazia." }, { status: 400 });
  if (rawContent.length > 1000) return NextResponse.json({ error: "A citação passou do limite de 1000 caracteres." }, { status: 400 });

  const { id } = await params;

  const target = await prisma.post.findUnique({
    where: { id },
    select: { id: true, repostOfId: true },
  });
  if (!target) return NextResponse.json({ error: "Post não encontrado" }, { status: 404 });

  // Sempre aponta para o original, nunca para um repost
  const originalId = target.repostOfId ?? target.id;

  const existing = await prisma.post.findFirst({
    where: { authorId: session.sub, repostOfId: originalId },
    select: { id: true },
  });
  if (existing) return NextResponse.json({ error: "Você já repostou este post." }, { status: 409 });

  const repost = await prisma.post.create({
    data: {
      content: rawContent,
      authorId: session.sub,
      repostOfId: originalId,
      communityId: null,
      replyToId: null,
    },
    include: {
      author: { select: { id: true, username: true, profileImageUrl: true, gender: true } },
      repostOf: { include: repostOfInclude },
      _count: { select: { likes: true, replies: true, reposts: true } },
    },
  });

  return NextResponse.json(
    {
      ...repost,
      createdAt: repost.createdAt.toISOString(),
      updatedAt: repost.updatedAt.toISOString(),
      likedByMe: false,
      repostedByMe: false,
      replyTo: null,
      repostOf: repost.repostOf
        ? {
            ...repost.repostOf,
            createdAt: repost.repostOf.createdAt.toISOString(),
            updatedAt: repost.repostOf.updatedAt.toISOString(),
            _count: {
              likes: repost.repostOf._count.likes,
              comments: repost.repostOf._count.replies,
              reposts: repost.repostOf._count.reposts,
            },
          }
        : null,
      _count: {
        likes: repost._count.likes,
        comments: repost._count.replies,
        reposts: repost._count.reposts,
      },
    },
    { status: 201 }
  );
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;

  const target = await prisma.post.findUnique({
    where: { id },
    select: { id: true, repostOfId: true },
  });
  if (!target) return NextResponse.json({ error: "Post não encontrado" }, { status: 404 });

  const originalId = target.repostOfId ?? target.id;

  await prisma.post.deleteMany({
    where: { authorId: session.sub, repostOfId: originalId },
  });

  return NextResponse.json({ ok: true });
}
