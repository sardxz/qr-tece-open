import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Prisma } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

type CriterionType =
  | "account_age_days"
  | "depos_received"
  | "depos_sent"
  | "friends_count"
  | "communities_joined"
  | "communities_created"
  | "likes_received"
  | "posts_count";

type Criterion = { type: CriterionType; min: number };

async function getEligibleIds(criterion: Criterion): Promise<Set<string>> {
  const { type, min } = criterion;

  switch (type) {
    case "account_age_days": {
      const cutoff = new Date(Date.now() - min * 24 * 60 * 60 * 1000);
      const rows = await prisma.user.findMany({
        where: { isActive: true, createdAt: { lte: cutoff } },
        select: { id: true },
      });
      return new Set(rows.map((r) => r.id));
    }

    case "depos_received": {
      const groups = await prisma.depo.groupBy({
        by: ["recipientId"],
        where: { status: "APPROVED" },
        _count: { _all: true },
      });
      return new Set(groups.filter((g) => g._count._all >= min).map((g) => g.recipientId));
    }

    case "depos_sent": {
      const groups = await prisma.depo.groupBy({
        by: ["authorId"],
        _count: { _all: true },
      });
      return new Set(groups.filter((g) => g._count._all >= min).map((g) => g.authorId));
    }

    case "friends_count": {
      const all = await prisma.friendship.findMany({
        where: { status: "ACCEPTED" },
        select: { requesterId: true, receiverId: true },
      });
      const counts = new Map<string, number>();
      for (const f of all) {
        counts.set(f.requesterId, (counts.get(f.requesterId) ?? 0) + 1);
        counts.set(f.receiverId, (counts.get(f.receiverId) ?? 0) + 1);
      }
      return new Set([...counts.entries()].filter(([, n]) => n >= min).map(([id]) => id));
    }

    case "communities_joined": {
      const groups = await prisma.communityMember.groupBy({
        by: ["userId"],
        _count: { _all: true },
      });
      return new Set(groups.filter((g) => g._count._all >= min).map((g) => g.userId));
    }

    case "communities_created": {
      const groups = await prisma.community.groupBy({
        by: ["createdById"],
        _count: { _all: true },
      });
      return new Set(groups.filter((g) => g._count._all >= min).map((g) => g.createdById));
    }

    case "likes_received": {
      const rows = await prisma.$queryRaw<Array<{ authorId: string }>>(
        Prisma.sql`
          SELECT p."authorId"
          FROM "Post" p
          INNER JOIN "Like" l ON l."postId" = p.id
          GROUP BY p."authorId"
          HAVING COUNT(l."userId") >= ${min}
        `,
      );
      return new Set(rows.map((r) => r.authorId));
    }

    case "posts_count": {
      const groups = await prisma.post.groupBy({
        by: ["authorId"],
        where: { replyToId: null },
        _count: { _all: true },
      });
      return new Set(groups.filter((g) => g._count._all >= min).map((g) => g.authorId));
    }
  }
}

export async function POST(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { id } = await params;

  const badge = await prisma.badge.findUnique({
    where: { id },
    include: { _count: { select: { awards: true } } },
  });

  if (!badge) return NextResponse.json({ error: "Badge não encontrada" }, { status: 404 });

  if (!badge.criteria || !Array.isArray(badge.criteria) || badge.criteria.length === 0) {
    return NextResponse.json(
      { error: "Esta badge não tem critérios definidos. Use a concessão manual." },
      { status: 400 },
    );
  }

  const criteria = badge.criteria as Criterion[];

  // Check stock before running expensive queries
  if (badge.totalSupply !== null) {
    const remaining = badge.totalSupply - badge._count.awards;
    if (remaining <= 0) {
      return NextResponse.json({ error: "Estoque esgotado para esta badge." }, { status: 409 });
    }
  }

  // Find eligible users: intersection of all criteria sets
  const sets = await Promise.all(criteria.map(getEligibleIds));
  const eligible = sets.reduce((acc, set) => {
    const intersection = new Set<string>();
    for (const id of acc) {
      if (set.has(id)) intersection.add(id);
    }
    return intersection;
  });

  if (eligible.size === 0) {
    return NextResponse.json({ granted: 0, skipped: 0, total_eligible: 0 });
  }

  // Find who already has this badge
  const alreadyHas = await prisma.showcaseItem.findMany({
    where: { badgeId: badge.id, userId: { in: [...eligible] } },
    select: { userId: true },
  });
  const alreadyHasIds = new Set(alreadyHas.map((i) => i.userId));

  const toGrant = [...eligible].filter((uid) => !alreadyHasIds.has(uid));

  // Respect totalSupply
  const remaining = badge.totalSupply !== null ? badge.totalSupply - badge._count.awards : Infinity;
  const grantBatch = toGrant.slice(0, remaining === Infinity ? undefined : remaining);

  if (grantBatch.length === 0) {
    return NextResponse.json({
      granted: 0,
      skipped: toGrant.length,
      total_eligible: eligible.size,
    });
  }

  const currentCount = badge._count.awards;
  await prisma.showcaseItem.createMany({
    data: grantBatch.map((userId, i) => ({
      userId,
      badgeId: badge.id,
      type: "BADGE" as const,
      name: badge.name,
      iconUrl: badge.iconUrl,
      rarity: badge.rarity,
      editionNumber: currentCount + i + 1,
      totalSupply: badge.totalSupply,
      position: null,
    })),
  });

  return NextResponse.json({
    granted: grantBatch.length,
    skipped: toGrant.length - grantBatch.length + alreadyHasIds.size,
    total_eligible: eligible.size,
  });
}
