import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { getSession, signToken, setAuthCookie, clearAuthCookie } from "@/lib/auth";
import { editProfileSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/rate-limit";

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { allowed } = rateLimit(`edit-profile:${session.sub}`, 5, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: "Muitas atualizações. Aguarde um momento." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }

  const parsed = editProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { username, gender, bio, city, state, birthYear, profilePhrase } = parsed.data;

  if (username !== session.username) {
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json({ error: "Username já está em uso" }, { status: 409 });
    }
  }

  const user = await prisma.user.update({
    where: { id: session.sub },
    data: {
      username,
      gender,
      bio: bio ?? null,
      city: city ?? null,
      state: state ? state.toUpperCase() : null,
      birthYear: birthYear ?? null,
      profilePhrase: profilePhrase ?? null,
    },
    select: {
      id: true,
      username: true,
      gender: true,
      bio: true,
      city: true,
      state: true,
      birthYear: true,
      profilePhrase: true,
      role: true,
      email: true,
    },
  });

  let newToken: string | undefined;
  if (username !== session.username) {
    newToken = await signToken({ sub: user.id, email: user.email, username: user.username, role: user.role });
    await setAuthCookie(newToken);
  }

  return NextResponse.json({ user, ...(newToken ? { token: newToken } : {}) });
}

export async function DELETE() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { allowed } = rateLimit(`delete-account:${session.sub}`, 3, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde um momento." }, { status: 429 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { id: true, isActive: true },
  });

  if (!user || !user.isActive) {
    return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 });
  }

  const suffix = randomBytes(8).toString("hex");

  await prisma.user.update({
    where: { id: session.sub },
    data: {
      email: `excluido_${suffix}@tece.deletado`,
      username: `excluido_${suffix}`,
      passwordHash: `DELETED_${randomBytes(32).toString("hex")}`,
      bio: null,
      city: null,
      state: null,
      birthYear: null,
      profilePhrase: null,
      profileImageUrl: null,
      isActive: false,
    },
  });

  await clearAuthCookie();

  return NextResponse.json({ ok: true });
}
