import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/users/me/collection
// Retorna a coleção de badges do usuário logado com flags de vitrine (para o picker mobile)
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const badges = await prisma.showcaseItem.findMany({
    where: { userId: session.sub, type: "BADGE" },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      iconUrl: true,
      rarity: true,
      position: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    badges: badges.map((item) => ({
      id: item.id,
      name: item.name,
      icon_url: item.iconUrl,
      rarity: item.rarity,
      acquired_at: item.createdAt.toISOString(),
      // posições 101-105 são reservadas para a vitrine mobile
      is_highlighted: item.position !== null && item.position >= 101 && item.position <= 105,
      position: item.position,
    })),
  });
}
