import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

type Params = { params: Promise<{ slug: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { allowed } = rateLimit(`join-community:${session.sub}`, 10, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde um momento." }, { status: 429 });
  }

  const { slug } = await params;

  const community = await prisma.community.findUnique({ where: { slug } });
  if (!community) return NextResponse.json({ error: "Comunidade não encontrada" }, { status: 404 });

  if (community.isPrivate) {
    return NextResponse.json(
      { error: "Esta comunidade é fechada — você precisa de um convite para entrar" },
      { status: 403 }
    );
  }

  const existing = await prisma.communityMember.findUnique({
    where: { userId_communityId: { userId: session.sub, communityId: community.id } },
    select: { userId: true },
  });

  if (!existing && community.maxMembers != null) {
    const memberCount = await prisma.communityMember.count({
      where: { communityId: community.id },
    });
    if (memberCount >= community.maxMembers) {
      return NextResponse.json(
        { error: "Esta comunidade atingiu o limite de membros" },
        { status: 409 }
      );
    }
  }

  await prisma.communityMember.upsert({
    where: { userId_communityId: { userId: session.sub, communityId: community.id } },
    create: { userId: session.sub, communityId: community.id },
    update: {},
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { slug } = await params;

  const community = await prisma.community.findUnique({ where: { slug } });
  if (!community) return NextResponse.json({ error: "Comunidade não encontrada" }, { status: 404 });

  if (community.createdById === session.sub) {
    return NextResponse.json({ error: "O criador não pode sair da comunidade" }, { status: 400 });
  }

  await prisma.communityMember.deleteMany({
    where: { userId: session.sub, communityId: community.id },
  });

  return NextResponse.json({ ok: true });
}
