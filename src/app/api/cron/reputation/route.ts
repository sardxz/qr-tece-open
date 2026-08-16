import { NextRequest, NextResponse } from "next/server";
import { recalculateAll } from "@/lib/reputation";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret");

  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    await recalculateAll();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[cron/reputation]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
