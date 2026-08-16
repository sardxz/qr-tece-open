import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";

type Params = { params: Promise<{ slug: string }> };

const schema = z.object({
  notifyNewPosts: z.boolean(),
});

// Permite que qualquer membro ligue/desligue a notificação de conteúdo novo
// da própria participação nesta comunidade.
export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { slug } = await params;

  const community = await prisma.community.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!community) return NextResponse.json({ error: "Comunidade não encontrada" }, { status: 404 });

  const membership = await prisma.communityMember.findUnique({
    where: { userId_communityId: { userId: session.sub, communityId: community.id } },
    select: { userId: true },
  });
  if (!membership) {
    return NextResponse.json({ error: "Você não é membro desta comunidade" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const updated = await prisma.communityMember.update({
    where: { userId_communityId: { userId: session.sub, communityId: community.id } },
    data: { notifyNewPosts: parsed.data.notifyNewPosts },
    select: { notifyNewPosts: true },
  });

  return NextResponse.json(updated);
}
