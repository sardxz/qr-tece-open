import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { allowed } = rateLimit(`search:${session.sub}`, 30, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: "Muitas buscas. Aguarde um momento." }, { status: 429 });
  }

  const rawQ = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const isCommunitySearch = rawQ.startsWith("#");
  const isUserSearch = rawQ.startsWith("@");
  const q = (isCommunitySearch || isUserSearch) ? rawQ.slice(1) : rawQ;

  if (q.length < 2) {
    return NextResponse.json({ users: [], communities: [] });
  }

  if (isCommunitySearch) {
    const communities = await prisma.community.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { slug: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, slug: true, coverImageUrl: true, _count: { select: { members: true } } },
      take: 10,
    });
    return NextResponse.json({ users: [], communities });
  }

  if (isUserSearch) {
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        username: { contains: q, mode: "insensitive" },
        NOT: { id: session.sub },
      },
      select: { id: true, username: true, gender: true },
      take: 10,
    });
    return NextResponse.json({ users, communities: [] });
  }

  const [users, communities] = await Promise.all([
    prisma.user.findMany({
      where: {
        isActive: true,
        username: { contains: q, mode: "insensitive" },
        NOT: { id: session.sub },
      },
      select: { id: true, username: true, gender: true },
      take: 10,
    }),
    prisma.community.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      select: { id: true, name: true, slug: true, coverImageUrl: true, _count: { select: { members: true } } },
      take: 10,
    }),
  ]);

  return NextResponse.json({ users, communities });
}
