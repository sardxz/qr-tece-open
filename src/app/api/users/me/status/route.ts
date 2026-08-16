import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";

const MANUAL_STATUS_VALUES = ["ONLINE", "BUSY", "AWAY", "OFFLINE"] as const;

const statusSchema = z.object({
  statusText: z.string().trim().max(60, "Status muito longo").nullable().optional(),
  manualStatus: z.enum(MANUAL_STATUS_VALUES).nullable().optional(),
});

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { allowed } = rateLimit(`edit-status:${session.sub}`, 10, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: "Muitas atualizações. Aguarde." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }

  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.statusText !== undefined) data.statusText = parsed.data.statusText ?? null;
  if (parsed.data.manualStatus !== undefined) data.manualStatus = parsed.data.manualStatus ?? null;

  await prisma.user.update({ where: { id: session.sub }, data });

  return NextResponse.json({ ok: true });
}
