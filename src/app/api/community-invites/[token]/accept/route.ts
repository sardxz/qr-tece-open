import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type Params = { params: Promise<{ token: string }> };

export async function POST(_request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { token } = await params;

  const invite = await prisma.communityInvite.findUnique({
    where: { token },
    include: {
      community: {
        select: { id: true, name: true, slug: true, coverImageUrl: true, maxMembers: true },
      },
    },
  });

  if (!invite || invite.revokedAt) {
    return NextResponse.json({ error: "Convite inválido ou revogado" }, { status: 404 });
  }

  const alreadyMember = await prisma.communityMember.findUnique({
    where: { userId_communityId: { userId: session.sub, communityId: invite.communityId } },
  });

  if (alreadyMember) {
    return NextResponse.json(
      { error: "Você já é membro desta comunidade", community: invite.community },
      { status: 409 }
    );
  }

  if (invite.community.maxMembers != null) {
    const memberCount = await prisma.communityMember.count({
      where: { communityId: invite.communityId },
    });
    if (memberCount >= invite.community.maxMembers) {
      return NextResponse.json(
        { error: "Esta comunidade atingiu o limite de membros" },
        { status: 409 }
      );
    }
  }

  await prisma.$transaction([
    prisma.communityMember.create({
      data: { userId: session.sub, communityId: invite.communityId },
    }),
    prisma.communityInvite.update({
      where: { id: invite.id },
      data: { usedCount: { increment: 1 } },
    }),
  ]);

  return NextResponse.json({ community: invite.community }, { status: 201 });
}
