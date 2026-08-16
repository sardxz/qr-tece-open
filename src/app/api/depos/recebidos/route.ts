import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const STATUSES = ["pending", "approved"] as const;
type StatusFilter = (typeof STATUSES)[number];

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const statusParam = req.nextUrl.searchParams.get("status")?.toLowerCase() ?? null;
  if (statusParam && !STATUSES.includes(statusParam as StatusFilter)) {
    return NextResponse.json({ error: "status inválido" }, { status: 400 });
  }

  const limit = Math.min(
    100,
    Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? "50"))
  );

  const select = {
    id: true,
    content: true,
    status: true,
    createdAt: true,
    approvedAt: true,
    author: {
      select: { username: true, profileImageUrl: true, gender: true },
    },
  } as const;

  const wantPending = !statusParam || statusParam === "pending";
  const wantApproved = !statusParam || statusParam === "approved";

  const [pending, approved] = await Promise.all([
    wantPending
      ? prisma.depo.findMany({
          where: { recipientId: session.sub, status: "PENDING" },
          orderBy: { createdAt: "desc" },
          take: limit,
          select,
        })
      : Promise.resolve([]),

    wantApproved
      ? prisma.depo.findMany({
          where: { recipientId: session.sub, status: "APPROVED" },
          orderBy: { approvedAt: "desc" },
          take: limit,
          select,
        })
      : Promise.resolve([]),
  ]);

  const serialize = (d: (typeof pending)[number]) => ({
    id: d.id,
    content: d.content,
    status: d.status,
    createdAt: d.createdAt.toISOString(),
    approvedAt: d.approvedAt?.toISOString() ?? null,
    author: d.author,
  });

  return NextResponse.json({
    pending: pending.map(serialize),
    approved: approved.map(serialize),
  });
}
