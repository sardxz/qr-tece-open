import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  await prisma.user.update({
    where: { id: session.sub },
    data: { lastSeenMentionsAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
