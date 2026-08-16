import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ username: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { username } = await params;

  const user = await prisma.user.findUnique({
    where: { username, isActive: true },
    select: { id: true },
  });

  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  const allItems = await prisma.showcaseItem.findMany({
    where: { userId: user.id },
    orderBy: { position: "asc" },
    select: {
      id: true,
      type: true,
      name: true,
      iconUrl: true,
      rarity: true,
    },
  });

  const toEntry = (item: (typeof allItems)[number]) => ({
    id: item.id,
    name: item.name,
    icon_url: item.iconUrl,
    rarity: item.rarity,
  });

  return NextResponse.json({
    badges:  allItems.filter((i) => i.type === "BADGE").map(toEntry),
    mascots: allItems.filter((i) => i.type === "MASCOT").map(toEntry),
    items:   allItems.filter((i) => i.type === "ITEM").map(toEntry),
    events:  allItems.filter((i) => i.type === "EVENT").map(toEntry),
    special: allItems.filter((i) => i.type === "SPECIAL").map(toEntry),
  });
}
