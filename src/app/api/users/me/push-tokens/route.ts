import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const registerSchema = z.object({
  token: z.string().min(10).max(200),
  platform: z.enum(["ANDROID", "IOS"]),
});

const removeSchema = z.object({
  token: z.string().min(10).max(200),
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { token, platform } = parsed.data;

  // Upsert: se o token já existe, atualiza o userId (caso o user tenha deslogado e outro logado no mesmo device).
  await prisma.pushToken.upsert({
    where: { token },
    create: { token, platform, userId: session.sub },
    update: { userId: session.sub, platform },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }

  const parsed = removeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  await prisma.pushToken.deleteMany({
    where: { token: parsed.data.token, userId: session.sub },
  });

  return NextResponse.json({ ok: true });
}
