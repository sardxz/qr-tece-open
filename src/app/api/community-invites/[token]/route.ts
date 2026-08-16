import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type Params = { params: Promise<{ token: string }> };

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.qrtece.com.br";

export async function GET(_request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { token } = await params;

  const invite = await prisma.communityInvite.findUnique({
    where: { token },
    include: {
      community: {
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          coverImageUrl: true,
          maxMembers: true,
          _count: { select: { members: true, posts: true } },
        },
      },
      createdBy: { select: { id: true, username: true } },
    },
  });

  if (!invite) {
    return NextResponse.json({ error: "Convite não encontrado" }, { status: 404 });
  }

  const memberCount = invite.community._count.members;
  const isFull = invite.community.maxMembers != null && memberCount >= invite.community.maxMembers;

  const membership = await prisma.communityMember.findUnique({
    where: { userId_communityId: { userId: session.sub, communityId: invite.communityId } },
    select: { userId: true },
  });

  const status = invite.revokedAt ? "revoked" : isFull ? "full" : "active";

  return NextResponse.json({
    token: invite.token,
    url: `${APP_URL}/convite/comunidade/${invite.token}`,
    status,
    isMember: !!membership,
    createdBy: invite.createdBy,
    community: {
      id: invite.community.id,
      name: invite.community.name,
      slug: invite.community.slug,
      description: invite.community.description,
      coverImageUrl: invite.community.coverImageUrl,
      memberCount,
      postCount: invite.community._count.posts,
    },
  });
}
