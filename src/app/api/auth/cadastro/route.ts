import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/bcrypt";
import { signToken, setAuthCookie } from "@/lib/auth";
import { cadastroSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const { allowed } = rateLimit(`cadastro:${ip}`, 5, 60_000);

  if (!allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde um momento." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }

  const parsed = cadastroSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { inviteCode, email, username, gender, password } = parsed.data;
  const termsAcceptedAt = new Date();

  const invite = await prisma.invite.findUnique({ where: { code: inviteCode } });

  if (!invite || invite.usedById !== null) {
    return NextResponse.json(
      { error: "Convite inválido ou já utilizado" },
      { status: 400 }
    );
  }

  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "Convite expirado" },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });

  if (existing) {
    const field = existing.email === email ? "E-mail" : "Username";
    return NextResponse.json(
      { error: `${field} já está em uso` },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const newUser = await tx.user.create({
      data: {
        email,
        username,
        gender,
        passwordHash,
        termsAcceptedAt,
        invitedById: invite.createdById,
      },
    });

    await tx.invite.update({
      where: { id: invite.id },
      data: { usedById: newUser.id, usedAt: new Date() },
    });

    return newUser;
  });

  const token = await signToken({
    sub: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
  });

  await setAuthCookie(token);

  return NextResponse.json(
    {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
      token,
    },
    { status: 201 }
  );
}
