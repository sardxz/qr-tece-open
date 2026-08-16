import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type Params = { params: Promise<{ username: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { username } = await params;
  const session = await getSession();

  const user = await prisma.user.findUnique({
    where: { username, isActive: true },
    select: { id: true },
  });

  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  const items = await prisma.showcaseItem.findMany({
    where: { userId: user.id, position: { not: null } },
    orderBy: { position: "asc" },
    select: {
      id: true,
      type: true,
      name: true,
      iconUrl: true,
      rarity: true,
      position: true,
    },
  });

  return NextResponse.json({
    items: items.map((item) => ({
      id: item.id,
      type: item.type.toLowerCase(),
      name: item.name,
      icon_url: item.iconUrl,
      rarity: item.rarity,
      position: item.position,
    })),
    is_owner: session?.username === username,
  });
}
