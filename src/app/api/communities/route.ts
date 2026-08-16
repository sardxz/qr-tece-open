import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createCommunitySchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  const session = await getSession();
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const sort = searchParams.get("sort") ?? "trending"; // trending | new | biggest

  const where: Prisma.CommunityWhereInput = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};

  // "new" e o fallback de "trending" vêm por data; "trending" é reordenado em memória.
  const orderBy: Prisma.CommunityOrderByWithRelationInput =
    sort === "biggest" ? { members: { _count: "desc" } } : { createdAt: "desc" };

  const communities = await prisma.community.findMany({
    where,
    orderBy,
    include: {
      createdBy: { select: { username: true } },
      _count: { select: { members: true, posts: true } },
      ...(session ? { members: { where: { userId: session.sub }, select: { role: true } } } : {}),
    },
  });

  // Atividade recente (posts top-level dos últimos 7 dias) por comu — base do "trending".
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentGroups = communities.length
    ? await prisma.post.groupBy({
        by: ["communityId"],
        where: {
          communityId: { in: communities.map((c) => c.id) },
          replyToId: null,
          createdAt: { gte: sevenDaysAgo },
        },
        _count: { _all: true },
      })
    : [];
  const recentMap = new Map<string, number>();
  for (const g of recentGroups) {
    if (g.communityId) recentMap.set(g.communityId, g._count._all);
  }

  const scored = communities.map((c) => {
    const membership = (c as typeof c & { members?: { role: string }[] }).members?.[0];
    const isJoined = !!membership;
    const myRole = membership?.role ?? null; // OWNER | MOD | MEMBER | null
    const recentPostCount = recentMap.get(c.id) ?? 0;
    // trending: atividade recente pesa 3x mais que tamanho da comu.
    const score = recentPostCount * 3 + c._count.members;
    return { c, isJoined, myRole, recentPostCount, score };
  });

  if (sort === "trending") {
    scored.sort((a, b) => b.score - a.score);
  }

  const communitiesOut = scored.map(({ c, isJoined, myRole, recentPostCount }) => {
    // Comu fechada que o usuário não participa: aparece na descoberta, mas sem vazar conteúdo.
    if (c.isPrivate && !isJoined) {
      return {
        id: c.id,
        name: c.name,
        slug: c.slug,
        coverImageUrl: c.coverImageUrl,
        isPrivate: true,
        isJoined: false,
        locked: true,
        // contagem zerada: não vaza o tamanho da comu fechada, mas mantém o formato
        // que o web espera (RightRail e afins acessam _count).
        _count: { members: 0, posts: 0 },
      };
    }

    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      coverImageUrl: c.coverImageUrl,
      isPrivate: c.isPrivate,
      isJoined,
      myRole, // 'OWNER' (você criou) | 'MOD' | 'MEMBER'
      locked: false,
      memberCount: c._count.members,
      postCount: c._count.posts,
      recentPostCount,
      createdBy: c.createdBy,
      createdAt: c.createdAt.toISOString(),
      // compatibilidade com o web (RightRail e afins ainda leem _count).
      _count: { members: c._count.members, posts: c._count.posts },
    };
  });

  return NextResponse.json({ communities: communitiesOut });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }

  const parsed = createCommunitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { name, slug, description, coverImageUrl, isPrivate, rules, maxMembers } = parsed.data;

  if (session.role !== "ADMIN") {
    const communityCount = await prisma.community.count({ where: { createdById: session.sub } });
    if (communityCount >= 2) {
      return NextResponse.json({ error: "Você já atingiu o limite de 2 comunidades criadas" }, { status: 403 });
    }
  }

  const existing = await prisma.community.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ error: "Já existe uma comunidade com este slug" }, { status: 409 });
  }

  const community = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const c = await tx.community.create({
      data: {
        name,
        slug,
        description: description ?? null,
        coverImageUrl,
        isPrivate: isPrivate ?? false,
        rules: rules ?? null,
        maxMembers: maxMembers ?? null,
        createdById: session.sub,
      },
    });

    await tx.communityMember.create({
      data: { userId: session.sub, communityId: c.id, role: "OWNER" },
    });

    return c;
  });

  return NextResponse.json({ ...community, createdAt: community.createdAt.toISOString() }, { status: 201 });
}
