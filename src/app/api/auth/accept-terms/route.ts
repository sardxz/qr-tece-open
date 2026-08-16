import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { termsAcceptedAt: true },
  });

  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  if (!user.termsAcceptedAt) {
    await prisma.user.update({
      where: { id: session.sub },
      data: { termsAcceptedAt: new Date() },
    });
  }

  return NextResponse.json({ ok: true });
}
