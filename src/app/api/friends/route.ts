import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { sendPushToUser } from "@/lib/push";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutos

  const friendships = await prisma.friendship.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: session.sub }, { receiverId: session.sub }],
    },
    include: {
      requester: { select: { id: true, username: true, gender: true, profileImageUrl: true, lastActiveAt: true, manualStatus: true } },
      receiver: { select: { id: true, username: true, gender: true, profileImageUrl: true, lastActiveAt: true, manualStatus: true } },
    },
  });

  const now = Date.now();
  const friends = friendships.map((f) => {
    const u = f.requesterId === session.sub ? f.receiver : f.requester;
    const autoOnline = !!u.lastActiveAt && now - u.lastActiveAt.getTime() < ONLINE_THRESHOLD_MS;
    const presenceStatus =
      !autoOnline ? "offline" :
      u.manualStatus === "BUSY" ? "busy" :
      u.manualStatus === "AWAY" ? "away" :
      u.manualStatus === "OFFLINE" ? "offline" :
      "online";
    return {
      id: u.id,
      username: u.username,
      gender: u.gender,
      profileImageUrl: u.profileImageUrl,
      presenceStatus,
    };
  });

  return NextResponse.json({ friends });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { allowed } = rateLimit(`friend-request:${session.sub}`, 10, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: "Muitos pedidos enviados. Aguarde um momento." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }

  const { receiverUsername } = body as { receiverUsername?: string };
  if (!receiverUsername) {
    return NextResponse.json({ error: "Username obrigatório" }, { status: 400 });
  }

  const receiver = await prisma.user.findUnique({
    where: { username: receiverUsername, isActive: true },
    select: { id: true },
  });

  if (!receiver) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  }

  if (receiver.id === session.sub) {
    return NextResponse.json({ error: "Você não pode se adicionar" }, { status: 400 });
  }

  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: session.sub, receiverId: receiver.id },
        { requesterId: receiver.id, receiverId: session.sub },
      ],
    },
  });

  if (existing) {
    return NextResponse.json({ error: "Pedido já existe" }, { status: 409 });
  }

  const friendship = await prisma.friendship.create({
    data: { requesterId: session.sub, receiverId: receiver.id },
  });

  await sendPushToUser(receiver.id, {
    title: "Novo pedido de amizade",
    body: `@${session.username} quer ser seu amigo.`,
    data: { type: "friendRequest", friendshipId: friendship.id },
  });

  return NextResponse.json({ friendship }, { status: 201 });
}
