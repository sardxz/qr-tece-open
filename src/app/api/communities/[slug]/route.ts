import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";

type Params = { params: Promise<{ slug: string }> };

const stripHtml = (v: string) => v.replace(/<[^>]*>/g, "").trim();

export async function GET(_request: NextRequest, { params }: Params) {
  const session = await getSession();
  const { slug } = await params;

  const community = await prisma.community.findUnique({
    where: { slug },
    include: {
      createdBy: { select: { id: true, username: true } },
      _count: { select: { members: true, posts: true } },
      ...(session ? { members: { where: { userId: session.sub }, select: { role: true, notifyNewPosts: true } } } : {}),
    },
  });

  if (!community) return NextResponse.json({ error: "Comunidade não encontrada" }, { status: 404 });

  const myMembership = session
    ? (community as typeof community & { members?: { role: string; notifyNewPosts: boolean }[] }).members?.[0] ?? null
    : null;

  return NextResponse.json({
    id: community.id,
    name: community.name,
    slug: community.slug,
    description: community.description,
    rules: community.rules,
    coverImageUrl: community.coverImageUrl,
    isPrivate: community.isPrivate,
    createdAt: community.createdAt.toISOString(),
    createdBy: community.createdBy,
    memberCount: community._count.members,
    postCount: community._count.posts,
    isMember: !!myMembership,
    myRole: myMembership?.role ?? null,
    notifyNewPosts: myMembership?.notifyNewPosts ?? null,
  });
}

const editCommunitySchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres").max(80, "Nome muito longo").transform(stripHtml).optional(),
  description: z.string().max(500, "Descrição muito longa").transform(stripHtml).optional().nullable(),
  rules: z.string().max(2000, "Regras muito longas").transform(stripHtml).optional().nullable(),
  coverImageUrl: z.string().optional(),
}).refine((d) => Object.keys(d).length > 0, { message: "Nenhum campo para atualizar" });

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { slug } = await params;

  const community = await prisma.community.findUnique({
    where: { slug },
    select: { id: true, createdById: true },
  });

  if (!community) return NextResponse.json({ error: "Comunidade não encontrada" }, { status: 404 });
  if (community.createdById !== session.sub) {
    return NextResponse.json({ error: "Apenas quem criou a comunidade pode editar" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }

  const parsed = editCommunitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const updated = await prisma.community.update({
    where: { id: community.id },
    data: parsed.data,
    select: { id: true, name: true, description: true, rules: true, coverImageUrl: true, slug: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { slug } = await params;

  const community = await prisma.community.findUnique({
    where: { slug },
    select: { id: true, createdById: true },
  });

  if (!community) {
    return NextResponse.json({ error: "Comunidade não encontrada" }, { status: 404 });
  }

  const isOwner = community.createdById === session.sub;
  const isAdmin = session.role === "ADMIN";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Sem permissão para excluir esta comunidade" }, { status: 403 });
  }

  await prisma.$transaction(async (tx) => {
    // Posts da própria comunidade
    const communityPosts = await tx.post.findMany({
      where: { communityId: community.id },
      select: { id: true },
    });
    const postIds = communityPosts.map((p) => p.id);

    // Reposts (no feed global) que citam posts da comunidade — tratados à mão
    // para não depender do cascade e poder limpar as dependências deles antes.
    const reposts = await tx.post.findMany({
      where: { repostOfId: { in: postIds } },
      select: { id: true },
    });
    const repostIds = reposts.map((p) => p.id);

    const affectedPostIds = [...postIds, ...repostIds];

    // Solta replies (de dentro ou de fora) que apontam para qualquer post afetado,
    // evitando erro de foreign key ao apagar os posts.
    await tx.post.updateMany({
      where: { replyToId: { in: affectedPostIds } },
      data: { replyToId: null },
    });

    // Dependências (curtidas e comentários) de todos os posts afetados
    await tx.like.deleteMany({ where: { postId: { in: affectedPostIds } } });
    await tx.comment.deleteMany({ where: { postId: { in: affectedPostIds } } });

    // Apaga reposts e depois os posts da comunidade
    await tx.post.deleteMany({ where: { id: { in: repostIds } } });
    await tx.post.deleteMany({ where: { communityId: community.id } });

    // Membros e a comunidade (os convites caem por cascade)
    await tx.communityMember.deleteMany({ where: { communityId: community.id } });
    await tx.community.delete({ where: { id: community.id } });
  });

  return NextResponse.json({ ok: true });
}
