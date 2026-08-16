import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// PUT /api/users/me/showcase
// Body: { slots: Array<{ position: number; itemId: string }> }
// positions 1-8, empty slots = remove item from that position
export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || !Array.isArray((body as Record<string, unknown>).slots)) {
    return NextResponse.json({ error: "slots deve ser um array" }, { status: 400 });
  }

  const slots = (body as { slots: unknown[] }).slots;

  if (slots.length > 8) {
    return NextResponse.json({ error: "Máximo de 8 slots na vitrine" }, { status: 400 });
  }

  for (const slot of slots) {
    if (
      !slot ||
      typeof slot !== "object" ||
      typeof (slot as Record<string, unknown>).position !== "number" ||
      typeof (slot as Record<string, unknown>).itemId !== "string"
    ) {
      return NextResponse.json({ error: "Cada slot deve ter position (number) e itemId (string)" }, { status: 400 });
    }
    const pos = (slot as { position: number }).position;
    if (!Number.isInteger(pos) || pos < 1 || pos > 8) {
      return NextResponse.json({ error: "position deve ser um inteiro entre 1 e 8" }, { status: 400 });
    }
  }

  // Ensure all itemIds belong to this user
  const itemIds = slots.map((s) => (s as { itemId: string }).itemId);
  const ownedItems = await prisma.showcaseItem.findMany({
    where: { id: { in: itemIds }, userId: session.sub },
    select: { id: true },
  });
  const ownedIds = new Set(ownedItems.map((i) => i.id));
  const invalid = itemIds.find((id) => !ownedIds.has(id));
  if (invalid) {
    return NextResponse.json({ error: "Item não encontrado na sua coleção" }, { status: 403 });
  }

  // Ensure no duplicate positions
  const positions = slots.map((s) => (s as { position: number }).position);
  if (new Set(positions).size !== positions.length) {
    return NextResponse.json({ error: "Posições duplicadas" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    // Limpa posições 1-100 (vitrine web). Posições 101+ são da vitrine mobile — não tocar.
    await tx.showcaseItem.updateMany({
      where: { userId: session.sub, position: { not: null, lte: 100 } },
      data: { position: null },
    });

    // Set new positions
    for (const slot of slots) {
      const { position, itemId } = slot as { position: number; itemId: string };
      await tx.showcaseItem.update({
        where: { id: itemId },
        data: { position },
      });
    }
  });

  return NextResponse.json({ ok: true });
}

// PATCH /api/users/me/showcase
// Body: { badges: string[] } — IDs ordenados (máx. 5) da vitrine de badges mobile
// Usa posições 101-105 para não conflitar com a vitrine web (posições 1-8)
export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }

  const rawBadges = (body as Record<string, unknown>).badges;
  if (!Array.isArray(rawBadges)) {
    return NextResponse.json({ error: "badges deve ser um array" }, { status: 400 });
  }

  if (rawBadges.length > 5) {
    return NextResponse.json({ error: "Máximo de 5 badges em destaque" }, { status: 400 });
  }

  if (!rawBadges.every((id) => typeof id === "string")) {
    return NextResponse.json({ error: "badges deve conter apenas IDs (strings)" }, { status: 400 });
  }

  const badgeIds = rawBadges as string[];

  if (new Set(badgeIds).size !== badgeIds.length) {
    return NextResponse.json({ error: "IDs duplicados não são permitidos" }, { status: 400 });
  }

  if (badgeIds.length > 0) {
    const owned = await prisma.showcaseItem.findMany({
      where: { id: { in: badgeIds }, userId: session.sub, type: "BADGE" },
      select: { id: true },
    });
    if (owned.length !== badgeIds.length) {
      return NextResponse.json({ error: "Uma ou mais badges não pertencem à sua coleção" }, { status: 403 });
    }
  }

  await prisma.$transaction(async (tx) => {
    // Limpa posições 101-105 (vitrine badge mobile) para este usuário
    await tx.showcaseItem.updateMany({
      where: { userId: session.sub, position: { gte: 101, lte: 105 } },
      data: { position: null },
    });

    // Atribui posições 101, 102, 103... na ordem enviada
    for (let i = 0; i < badgeIds.length; i++) {
      await tx.showcaseItem.update({
        where: { id: badgeIds[i] },
        data: { position: 101 + i },
      });
    }
  });

  const updated = await prisma.showcaseItem.findMany({
    where: { userId: session.sub, type: "BADGE", position: { gte: 101, lte: 105 } },
    orderBy: { position: "asc" },
    select: { id: true, name: true, iconUrl: true, rarity: true, position: true },
  });

  return NextResponse.json({
    badges: updated.map((item) => ({
      id: item.id,
      name: item.name,
      icon_url: item.iconUrl,
      rarity: item.rarity,
      position: item.position,
    })),
  });
}
