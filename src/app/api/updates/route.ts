import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const createUpdateSchema = z.object({
  content: z.string().min(1).max(1000),
  type: z.enum(["FEATURE", "FIX", "BUG"]).default("FEATURE"),
});

export async function GET() {
  const session = await getSession();

  const updates = await prisma.siteUpdate.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      author: { select: { username: true } },
      _count: { select: { likes: true } },
      ...(session ? { likes: { where: { userId: session.sub }, select: { userId: true } } } : {}),
    },
  });

  return NextResponse.json({
    updates: updates.map((u) => ({
      id: u.id,
      content: u.content,
      type: u.type,
      createdAt: u.createdAt.toISOString(),
      author: u.author,
      likeCount: u._count.likes,
      likedByMe: session ? (u as typeof u & { likes?: { userId: string }[] }).likes?.length > 0 : false,
    })),
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }

  const parsed = createUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const update = await prisma.siteUpdate.create({
    data: { content: parsed.data.content, type: parsed.data.type, authorId: session.sub },
    include: { author: { select: { username: true } }, _count: { select: { likes: true } } },
  });

  return NextResponse.json({
    id: update.id,
    content: update.content,
    type: update.type,
    createdAt: update.createdAt.toISOString(),
    author: update.author,
    likeCount: 0,
    likedByMe: false,
  }, { status: 201 });
}
