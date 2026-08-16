import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const idsParam = searchParams.get("ids");

  if (!idsParam) {
    return NextResponse.json({ error: "ids obrigatório" }, { status: 400 });
  }

  const ids = idsParam.split(",").filter(Boolean).slice(0, 50);

  const posts = await prisma.post.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      _count: { select: { likes: true, replies: true, reposts: true } },
    },
  });

  const counts: Record<string, { likes: number; comments: number; reposts: number }> = {};
  for (const p of posts) {
    counts[p.id] = { likes: p._count.likes, comments: p._count.replies, reposts: p._count.reposts };
  }

  return NextResponse.json(counts);
}
