import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false });

  await prisma.user.update({
    where: { id: session.sub },
    data: { lastActiveAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
