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

  const topFriends = await prisma.topFriend.findMany({
    where: { userId: user.id },
    orderBy: { position: "asc" },
    take: 8,
    select: {
      position: true,
      friend: {
        select: {
          id: true,
          username: true,
          gender: true,
          profileImageUrl: true,
        },
      },
    },
  });

  return NextResponse.json({
    friends: topFriends.map((tf) => ({
      position: tf.position,
      id: tf.friend.id,
      username: tf.friend.username,
      gender: tf.friend.gender,
      profile_image_url: tf.friend.profileImageUrl,
    })),
    is_owner: session?.username === username,
  });
}
