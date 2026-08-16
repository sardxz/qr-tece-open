import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const requests = await prisma.friendship.findMany({
    where: { receiverId: session.sub, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    include: {
      requester: { select: { id: true, username: true, gender: true } },
    },
  });

  return NextResponse.json({ requests });
}
