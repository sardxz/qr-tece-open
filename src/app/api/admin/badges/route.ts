import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const VALID_RARITIES = ["common", "rare", "epic", "legendary"] as const;

const VALID_CRITERION_TYPES = [
  "account_age_days",
  "depos_received",
  "depos_sent",
  "friends_count",
  "communities_joined",
  "communities_created",
  "likes_received",
  "posts_count",
] as const;

type CriterionType = (typeof VALID_CRITERION_TYPES)[number];
type Criterion = { type: CriterionType; min: number };

function validateCriteria(raw: unknown): Criterion[] | null {
  if (!Array.isArray(raw)) return null;
  for (const c of raw) {
    if (!c || typeof c !== "object") return null;
    const { type, min } = c as Record<string, unknown>;
    if (!VALID_CRITERION_TYPES.includes(type as CriterionType)) return null;
    if (typeof min !== "number" || !Number.isInteger(min) || min < 1) return null;
  }
  return raw as Criterion[];
}

export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const badges = await prisma.badge.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { awards: true } } },
  });

  return NextResponse.json({
    badges: badges.map((b) => ({
      id: b.id,
      name: b.name,
      icon_url: b.iconUrl,
      rarity: b.rarity,
      total_supply: b.totalSupply,
      description: b.description,
      criteria: b.criteria,
      awarded_count: b._count.awards,
      created_at: b.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }

  const { name, iconUrl, rarity, totalSupply: rawTotalSupply, description, criteria } =
    body as Record<string, unknown>;

  if (typeof name !== "string" || name.trim().length === 0)
    return NextResponse.json({ error: "name é obrigatório" }, { status: 400 });

  if (typeof iconUrl !== "string" || iconUrl.trim().length === 0)
    return NextResponse.json({ error: "iconUrl é obrigatório" }, { status: 400 });

  if (!VALID_RARITIES.includes(rarity as (typeof VALID_RARITIES)[number]))
    return NextResponse.json(
      { error: `rarity inválida. Use: ${VALID_RARITIES.join(", ")}` },
      { status: 400 },
    );

  let totalSupply: number | null = null;
  if (rawTotalSupply !== undefined && rawTotalSupply !== null && rawTotalSupply !== "") {
    const parsed = Number(rawTotalSupply);
    if (!Number.isInteger(parsed) || parsed < 1)
      return NextResponse.json({ error: "totalSupply deve ser um inteiro positivo" }, { status: 400 });
    totalSupply = parsed;
  }

  let parsedCriteria: Criterion[] | null = null;
  if (criteria !== undefined && criteria !== null) {
    parsedCriteria = validateCriteria(criteria);
    if (!parsedCriteria)
      return NextResponse.json(
        {
          error: `criteria inválido. Cada critério deve ter type (${VALID_CRITERION_TYPES.join(", ")}) e min (inteiro positivo).`,
        },
        { status: 400 },
      );
  }

  const badge = await prisma.badge.create({
    data: {
      name: name.trim(),
      iconUrl: iconUrl.trim(),
      rarity: rarity as string,
      totalSupply,
      description: typeof description === "string" ? description.trim() : null,
      criteria: parsedCriteria ?? undefined,
      createdById: session.sub,
    },
  });

  return NextResponse.json({
    id: badge.id,
    name: badge.name,
    rarity: badge.rarity,
    criteria: badge.criteria,
  });
}
