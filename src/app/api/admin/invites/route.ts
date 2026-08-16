import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import crypto from "crypto";

const MAX_INVITES = 85;

function generateCode(): string {
  return crypto.randomBytes(6).toString("hex").toUpperCase();
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const total = await prisma.invite.count();
  return NextResponse.json({ total, max: MAX_INVITES, remaining: MAX_INVITES - total });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }

  const { count = 1 } = body as { count?: number };

  const total = await prisma.invite.count();
  const remaining = MAX_INVITES - total;

  if (remaining <= 0) {
    return NextResponse.json(
      { error: `Limite de ${MAX_INVITES} convites atingido para esta fase.` },
      { status: 409 }
    );
  }

  const qty = Math.min(Math.max(1, Math.floor(count)), remaining);

  const invites = Array.from({ length: qty }, () => ({
    code: generateCode(),
    createdById: session.sub,
  }));

  await prisma.invite.createMany({ data: invites });

  return NextResponse.json({ codes: invites.map((i) => i.code) }, { status: 201 });
}
