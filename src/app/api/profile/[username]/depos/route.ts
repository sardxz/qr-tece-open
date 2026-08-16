import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ username: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { username } = await params;

  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? "1"));
  const limit = Math.min(50, Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? "10")));
  const skip = (page - 1) * limit;

  const user = await prisma.user.findUnique({
    where: { username, isActive: true },
    select: { id: true },
  });

  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  const [depos, total] = await Promise.all([
    prisma.depo.findMany({
      where: { recipientId: user.id, status: "APPROVED" },
      orderBy: { approvedAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        content: true,
        approvedAt: true,
        author: {
          select: {
            username: true,
            profileImageUrl: true,
            gender: true,
          },
        },
      },
    }),
    prisma.depo.count({ where: { recipientId: user.id, status: "APPROVED" } }),
  ]);

  return NextResponse.json({
    depos,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
