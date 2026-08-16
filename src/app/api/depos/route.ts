import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createDepoSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/rate-limit";
import { sendPushToUser } from "@/lib/push";
import { canShareLinks } from "@/lib/reputation";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const { allowed } = rateLimit(`depo:${session.sub}:${ip}`, 5, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }

  const parsed = createDepoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { content, recipientUsername } = parsed.data;

  const hasLink = /https?:\/\/|www\.|[a-z0-9-]+\.(com|net|org|br|io|co|app|dev|info|biz)(\/|\s|$)/i.test(content);
  if (hasLink && session.role !== "ADMIN") {
    const author = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { reputationScore: true },
    });
    if (!author || !canShareLinks(author.reputationScore)) {
      return NextResponse.json(
        { error: "Seu score precisa ser pelo menos 200 para compartilhar links." },
        { status: 403 }
      );
    }
  }

  const recipient = await prisma.user.findUnique({
    where: { username: recipientUsername, isActive: true },
  });

  if (!recipient) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  }

  if (recipient.id === session.sub) {
    return NextResponse.json({ error: "Você não pode se depar" }, { status: 400 });
  }

  // Impede depo duplicado pendente
  const existing = await prisma.depo.findFirst({
    where: { authorId: session.sub, recipientId: recipient.id, status: "PENDING" },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Você já tem um depo pendente para esta pessoa" },
      { status: 409 }
    );
  }

  const depo = await prisma.depo.create({
    data: { content, authorId: session.sub, recipientId: recipient.id },
  });

  await sendPushToUser(recipient.id, {
    title: "Novo depo pendente",
    body: `@${session.username} te deixou um depo. Aprove pra aparecer no perfil.`,
    data: { type: "depo", depoId: depo.id },
  });

  return NextResponse.json(depo, { status: 201 });
}
