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

  const [friendships, total] = await Promise.all([
    prisma.friendship.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ requesterId: user.id }, { receiverId: user.id }],
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        createdAt: true,
        requester: { select: { id: true, username: true, profileImageUrl: true, gender: true } },
        receiver: { select: { id: true, username: true, profileImageUrl: true, gender: true } },
        requesterId: true,
      },
    }),
    prisma.friendship.count({
      where: {
        status: "ACCEPTED",
        OR: [{ requesterId: user.id }, { receiverId: user.id }],
      },
    }),
  ]);

  const friends = friendships.map((f) => {
    const friend = f.requesterId === user.id ? f.receiver : f.requester;
    return {
      id: friend.id,
      username: friend.username,
      profileImageUrl: friend.profileImageUrl,
      gender: friend.gender,
      friendsSince: f.createdAt.toISOString(),
    };
  });

  return NextResponse.json({ friends, total, page, totalPages: Math.ceil(total / limit) });
}
