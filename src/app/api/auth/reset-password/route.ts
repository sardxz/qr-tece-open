import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/bcrypt";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const { allowed } = rateLimit(`reset-password:${ip}`, 5, 600_000);

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

  const token = typeof body === "object" && body !== null && "token" in body
    ? String((body as Record<string, unknown>).token).trim()
    : "";

  const password = typeof body === "object" && body !== null && "password" in body
    ? String((body as Record<string, unknown>).password)
    : "";

  if (!token) {
    return NextResponse.json({ error: "Token inválido" }, { status: 400 });
  }

  if (!password || password.length < 8) {
    return NextResponse.json(
      { error: "Senha deve ter pelo menos 8 caracteres" },
      { status: 400 }
    );
  }

  if (password.length > 100) {
    return NextResponse.json({ error: "Senha muito longa" }, { status: 400 });
  }

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });

  if (!resetToken || resetToken.usedAt !== null || resetToken.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "Link inválido ou expirado. Solicite um novo." },
      { status: 400 }
    );
  }

  const passwordHash = await hashPassword(password);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
