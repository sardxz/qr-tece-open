import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const { allowed } = rateLimit(`forgot-password:${ip}`, 3, 600_000);

  if (!allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde 10 minutos." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }

  const email = typeof body === "object" && body !== null && "email" in body
    ? String((body as Record<string, unknown>).email).trim().toLowerCase()
    : "";

  if (!email) {
    return NextResponse.json({ error: "E-mail obrigatório" }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: { email, isActive: true },
    select: { id: true, email: true },
  });

  // Retorna 200 mesmo se o e-mail não existir — não revelar quais e-mails estão cadastrados
  if (!user) {
    return NextResponse.json({ ok: true });
  }

  // Invalida tokens anteriores do mesmo usuário
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

  await prisma.passwordResetToken.create({
    data: { token, userId: user.id, expiresAt },
  });

  await sendPasswordResetEmail(user.email, token);

  return NextResponse.json({ ok: true });
}
