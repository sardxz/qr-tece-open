import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ username: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { username } = await params;

  const user = await prisma.user.findUnique({
    where: { username, isActive: true },
    select: {
      invitedUsers: {
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          username: true,
          gender: true,
          profileImageUrl: true,
        },
      },
    },
  });

  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  return NextResponse.json({ afilhados: user.invitedUsers });
}
