import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }

  const { action } = body as { action?: string };

  if (!action || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  }

  const depo = await prisma.depo.findUnique({ where: { id } });

  if (!depo) return NextResponse.json({ error: "Depo não encontrado" }, { status: 404 });
  if (depo.recipientId !== session.sub) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }
  if (depo.status !== "PENDING") {
    return NextResponse.json({ error: "Depo já processado" }, { status: 409 });
  }

  if (action === "reject") {
    await prisma.depo.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  }

  const updated = await prisma.depo.update({
    where: { id },
    data: { status: "APPROVED", approvedAt: new Date() },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;

  const depo = await prisma.depo.findUnique({ where: { id } });

  if (!depo) return NextResponse.json({ error: "Depo não encontrado" }, { status: 404 });

  const canDelete =
    depo.authorId === session.sub ||
    depo.recipientId === session.sub ||
    session.role === "ADMIN";

  if (!canDelete) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  await prisma.depo.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
