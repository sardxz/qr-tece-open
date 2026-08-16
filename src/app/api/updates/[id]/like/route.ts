import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { allowed } = rateLimit(`like-update:${session.sub}`, 60, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: "Muitas ações. Aguarde um momento." }, { status: 429 });
  }

  const { id } = await params;

  await prisma.updateLike.upsert({
    where: { userId_updateId: { userId: session.sub, updateId: id } },
    create: { userId: session.sub, updateId: id },
    update: {},
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;

  await prisma.updateLike.deleteMany({
    where: { userId: session.sub, updateId: id },
  });

  return NextResponse.json({ ok: true });
}
