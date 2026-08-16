import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const VALID_RARITIES = ["common", "rare", "epic", "legendary"] as const;
type Rarity = (typeof VALID_RARITIES)[number];

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

  const { username, name, iconUrl, rarity, totalSupply: rawTotalSupply, description } = body as Record<string, unknown>;

  if (typeof username !== "string" || username.trim().length === 0) {
    return NextResponse.json({ error: "username é obrigatório" }, { status: 400 });
  }
  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "name é obrigatório" }, { status: 400 });
  }
  if (typeof iconUrl !== "string" || iconUrl.trim().length === 0) {
    return NextResponse.json({ error: "iconUrl é obrigatório" }, { status: 400 });
  }
  if (!VALID_RARITIES.includes(rarity as Rarity)) {
    return NextResponse.json(
      { error: `rarity inválida. Use: ${VALID_RARITIES.join(", ")}` },
      { status: 400 },
    );
  }

  // Accept number or numeric string (HTML inputs always send strings)
  let totalSupply: number | null = null;
  if (rawTotalSupply !== undefined && rawTotalSupply !== null && rawTotalSupply !== "") {
    const parsed = Number(rawTotalSupply);
    if (!Number.isInteger(parsed) || parsed < 1) {
      return NextResponse.json({ error: "totalSupply deve ser um inteiro positivo" }, { status: 400 });
    }
    totalSupply = parsed;
  }

  const recipient = await prisma.user.findUnique({
    where: { username: username.trim(), isActive: true },
    select: { id: true },
  });
  if (!recipient) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  }

  // Check stock if totalSupply is set
  const existingBadge = await prisma.badge.findFirst({
    where: { name: name.trim() },
    include: { _count: { select: { awards: true } } },
  });

  if (existingBadge?.totalSupply != null) {
    if (existingBadge._count.awards >= existingBadge.totalSupply) {
      return NextResponse.json(
        { error: `Estoque esgotado. Esta badge tem limite de ${existingBadge.totalSupply} unidades.` },
        { status: 409 },
      );
    }
  }

  // Prevent duplicate: same badge to same user
  if (existingBadge) {
    const alreadyHas = await prisma.showcaseItem.findFirst({
      where: { userId: recipient.id, badgeId: existingBadge.id },
    });
    if (alreadyHas) {
      return NextResponse.json({ error: "Este usuário já possui esta badge" }, { status: 409 });
    }
  }

  const badge = await prisma.$transaction(async (tx) => {
    const b = existingBadge
      ? existingBadge
      : await tx.badge.create({
          data: {
            name: name.trim(),
            iconUrl: iconUrl.trim(),
            rarity: rarity as string,
            totalSupply,
            description: typeof description === "string" ? description.trim() : null,
            createdById: session.sub,
          },
        });

    const editionNumber = (await tx.showcaseItem.count({ where: { badgeId: b.id } })) + 1;

    await tx.showcaseItem.create({
      data: {
        userId: recipient.id,
        badgeId: b.id,
        type: "BADGE",
        name: b.name,
        iconUrl: b.iconUrl,
        rarity: b.rarity,
        editionNumber,
        totalSupply: b.totalSupply,
        position: null,
      },
    });

    return b;
  });

  return NextResponse.json({
    badge_id: badge.id,
    name: badge.name,
    rarity: badge.rarity,
    granted_to: username.trim(),
  });
}
