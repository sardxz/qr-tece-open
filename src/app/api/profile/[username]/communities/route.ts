import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ username: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { username } = await params;

  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? "24")));
  const skip = (page - 1) * limit;

  const user = await prisma.user.findUnique({
    where: { username, isActive: true },
    select: { id: true },
  });

  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  const [memberships, total] = await Promise.all([
    prisma.communityMember.findMany({
      where: { userId: user.id },
      orderBy: { joinedAt: "desc" },
      skip,
      take: limit,
      select: {
        joinedAt: true,
        role: true,
        community: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            coverImageUrl: true,
            _count: { select: { members: true } },
          },
        },
      },
    }),
    prisma.communityMember.count({ where: { userId: user.id } }),
  ]);

  const communities = memberships.map((m) => ({
    id: m.community.id,
    name: m.community.name,
    slug: m.community.slug,
    description: m.community.description,
    coverImageUrl: m.community.coverImageUrl,
    memberCount: m.community._count.members,
    joinedAt: m.joinedAt.toISOString(),
    role: m.role,
  }));

  return NextResponse.json({ communities, total, page, totalPages: Math.ceil(total / limit) });
}
