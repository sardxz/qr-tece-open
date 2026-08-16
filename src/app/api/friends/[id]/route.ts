import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { sendPushToUser } from "@/lib/push";

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
  if (action !== "accept" && action !== "reject") {
    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  }

  const friendship = await prisma.friendship.findUnique({ where: { id } });

  if (!friendship) {
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  }

  if (friendship.receiverId !== session.sub) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  if (action === "reject") {
    await prisma.friendship.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  }

  const updated = await prisma.friendship.update({
    where: { id },
    data: { status: "ACCEPTED" },
  });

  await sendPushToUser(updated.requesterId, {
    title: "Pedido de amizade aceito",
    body: `@${session.username} aceitou seu pedido. Vocês agora são amigos.`,
    data: { type: "friendAccepted", friendshipId: updated.id },
  });

  return NextResponse.json({ friendship: updated });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;

  const friendship = await prisma.friendship.findUnique({ where: { id } });

  if (!friendship) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  if (friendship.requesterId !== session.sub && friendship.receiverId !== session.sub) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  await prisma.friendship.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
