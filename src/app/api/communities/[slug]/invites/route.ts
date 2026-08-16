import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { randomBytes } from "crypto";

type Params = { params: Promise<{ slug: string }> };

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.qrtece.com.br";
const inviteUrl = (token: string) => `${APP_URL}/convite/comunidade/${token}`;

export async function GET(_request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { slug } = await params;

  const community = await prisma.community.findUnique({
    where: { slug },
    select: { id: true, createdById: true },
  });

  if (!community) return NextResponse.json({ error: "Comunidade não encontrada" }, { status: 404 });
  if (community.createdById !== session.sub) {
    return NextResponse.json({ error: "Apenas o criador pode gerenciar convites" }, { status: 403 });
  }

  const invite = await prisma.communityInvite.findFirst({
    where: { communityId: community.id, revokedAt: null },
    orderBy: { createdAt: "desc" },
    select: { token: true, usedCount: true, createdAt: true },
  });

  return NextResponse.json({
    invite: invite ? { ...invite, url: inviteUrl(invite.token) } : null,
    url: invite ? inviteUrl(invite.token) : null,
  });
}

export async function POST(_request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { slug } = await params;

  const community = await prisma.community.findUnique({
    where: { slug },
    select: { id: true, createdById: true, name: true },
  });

  if (!community) return NextResponse.json({ error: "Comunidade não encontrada" }, { status: 404 });
  if (community.createdById !== session.sub) {
    return NextResponse.json({ error: "Apenas o criador pode gerar convites" }, { status: 403 });
  }

  let invite: { token: string; usedCount: number; createdAt: Date };
  try {
    await prisma.communityInvite.updateMany({
      where: { communityId: community.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    const token = randomBytes(16).toString("hex");

    invite = await prisma.communityInvite.create({
      data: { token, communityId: community.id, createdById: session.sub },
      select: { token: true, usedCount: true, createdAt: true },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `db: ${msg}` }, { status: 500 });
  }

  return NextResponse.json(
    { token: invite.token, url: inviteUrl(invite.token), invite },
    { status: 201 }
  );
}
