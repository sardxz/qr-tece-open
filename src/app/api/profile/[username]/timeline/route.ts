import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ username: string }> };

type TimelineEvent = {
  id: string;
  type: string;
  text: string;
  date: string;
  sortAt: number; // epoch ms — usado só para ordenação, não exposto na resposta
};

function toDate(d: Date): string {
  return d.toISOString().split("T")[0]!;
}

function eventText(type: string, metadata: Record<string, string> | null): string {
  switch (type) {
    case "joined":            return "Entrou no qr.tecê";
    case "first_depo":        return "Fez seu primeiro depo";
    case "depo_received":     return "Recebeu um depo";
    case "badge_earned":      return `Ganhou badge "${metadata?.name ?? ""}"`;
    case "community_created": return `Criou a comunidade "${metadata?.name ?? ""}"`;
    case "friend_added":      return `Fez amizade com @${metadata?.username ?? ""}`;
    default:                  return type;
  }
}

export async function GET(req: NextRequest, { params }: Params) {
  const { username } = await params;
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "5", 10), 1), 50);

  const user = await prisma.user.findUnique({
    where: { username, isActive: true },
    select: {
      id: true,
      createdAt: true,
      sentDepos: {
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { createdAt: true },
      },
      createdCommunities: {
        orderBy: { createdAt: "asc" },
        select: { name: true, createdAt: true },
      },
    },
  });

  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  // Events stored in the dedicated table (written by future actions)
  const stored = await prisma.userEvent.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const storedIds = new Set(stored.map((e) => e.type));

  // Derive events from existing data when not yet stored
  const derived: TimelineEvent[] = [];

  derived.push({
    id: `joined-${user.id}`,
    type: "joined",
    text: "Entrou no Tecê",
    date: toDate(user.createdAt),
    sortAt: user.createdAt.getTime(),
  });

  if (!storedIds.has("first_depo") && user.sentDepos[0]) {
    derived.push({
      id: `first_depo-${user.id}`,
      type: "first_depo",
      text: "Fez seu primeiro depo",
      date: toDate(user.sentDepos[0].createdAt),
      sortAt: user.sentDepos[0].createdAt.getTime(),
    });
  }

  if (!storedIds.has("community_created")) {
    for (const community of user.createdCommunities) {
      derived.push({
        id: `community_created-${community.createdAt.getTime()}`,
        type: "community_created",
        text: `Criou a comunidade "${community.name}"`,
        date: toDate(community.createdAt),
        sortAt: community.createdAt.getTime(),
      });
    }
  }

  const fromTable: TimelineEvent[] = stored.map((e) => ({
    id: e.id,
    type: e.type,
    text: eventText(e.type, e.metadata as Record<string, string> | null),
    date: toDate(e.createdAt),
    sortAt: e.createdAt.getTime(),
  }));

  const all = [...derived, ...fromTable];

  // "joined" é sempre o marco inicial — vai para o final da lista (fundo da tela)
  // independente de timestamp, pois é por definição o primeiro evento de qualquer usuário
  const joinedEvent = all.find((e) => e.type === "joined");
  const rest = all
    .filter((e) => e.type !== "joined")
    .sort((a, b) => b.sortAt - a.sortAt);

  const sorted = joinedEvent ? [...rest, joinedEvent] : rest;
  const events = sorted.slice(0, limit).map(({ sortAt: _, ...e }) => e);

  return NextResponse.json({ events });
}
