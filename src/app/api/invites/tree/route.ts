import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getReputationTier } from "@/lib/reputation";

/** GET /api/invites/tree — padrinho e afilhados do usuário logado */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      invitedBy: {
        select: {
          id: true,
          username: true,
          profileImageUrl: true,
          reputationScore: true,
        },
      },
      invitedUsers: {
        select: {
          id: true,
          username: true,
          profileImageUrl: true,
          reputationScore: true,
          createdAt: true,
          lastActiveAt: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  const padrinho = user.invitedBy
    ? {
        id: user.invitedBy.id,
        username: user.invitedBy.username,
        profileImageUrl: user.invitedBy.profileImageUrl,
        reputationScore: user.invitedBy.reputationScore,
        tier: getReputationTier(user.invitedBy.reputationScore),
      }
    : null;

  const afilhados = user.invitedUsers.map((u) => ({
    id: u.id,
    username: u.username,
    profileImageUrl: u.profileImageUrl,
    reputationScore: u.reputationScore,
    tier: getReputationTier(u.reputationScore),
    joinedAt: u.createdAt,
    lastActiveAt: u.lastActiveAt,
  }));

  return NextResponse.json({ padrinho, afilhados });
}
