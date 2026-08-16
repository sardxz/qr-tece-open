import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getMonthlyInviteQuota } from "@/lib/reputation";
import crypto from "crypto";

function generateCode(): string {
  return crypto.randomBytes(6).toString("hex").toUpperCase();
}

function startOfCurrentMonth(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function startOfNextMonth(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 1);
}

/** GET /api/invites — status do convite mensal do usuário */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { reputationScore: true, role: true, bonusInvites: true },
  });
  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  const isAdmin = user.role === "ADMIN";
  const regularQuota = isAdmin ? Infinity : getMonthlyInviteQuota(user.reputationScore);

  const invitesThisMonth = await prisma.invite.findMany({
    where: { createdById: session.sub, createdAt: { gte: startOfCurrentMonth() } },
    select: { id: true, code: true, usedById: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  const bonusRemaining = user.bonusInvites;
  const totalQuota = isAdmin ? Infinity : regularQuota + bonusRemaining;

  const usedCount = invitesThisMonth.filter((i) => i.usedById !== null).length;
  const pendingInvites = invitesThisMonth.filter((i) => i.usedById === null);
  const activeInvite = pendingInvites[0] ?? null;
  const canGenerate = isAdmin || invitesThisMonth.length < totalQuota;

  return NextResponse.json({
    quota: regularQuota === Infinity ? null : regularQuota,
    usedThisMonth: usedCount,
    generatedThisMonth: invitesThisMonth.length,
    // activeInvite (singular) mantido para retrocompatibilidade; activeInvites
    // traz todos os convites pendentes do mês, para o usuário distribuir os extras.
    activeInvite: activeInvite
      ? { code: activeInvite.code, createdAt: activeInvite.createdAt }
      : null,
    activeInvites: pendingInvites.map((i) => ({ code: i.code, createdAt: i.createdAt })),
    canGenerate,
    isAdmin,
    nextResetAt: startOfNextMonth(),
    bonusRemaining,
  });
}

/** POST /api/invites — gera o convite */
export async function POST(_request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { reputationScore: true, role: true, bonusInvites: true },
  });
  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  const isAdmin = user.role === "ADMIN";
  const regularQuota = isAdmin ? Infinity : getMonthlyInviteQuota(user.reputationScore);

  const monthStart = startOfCurrentMonth();
  const invitesThisMonth = await prisma.invite.findMany({
    where: { createdById: session.sub, createdAt: { gte: monthStart } },
    select: { id: true, code: true, usedById: true },
  });

  const promoBonus = user.bonusInvites;
  const totalQuota = isAdmin ? Infinity : regularQuota + promoBonus;

  if (!isAdmin && totalQuota === 0) {
    return NextResponse.json(
      { error: "Seu score está muito baixo para gerar convites." },
      { status: 403 }
    );
  }

  // Cota do mês esgotada (cota regular + todos os bônus). Enquanto houver saldo,
  // o usuário gera quantos convites quiser; só ao esgotar voltamos a devolver o
  // convite pendente (caso clássico de 1/mês) ou recusamos.
  if (!isAdmin && invitesThisMonth.length >= totalQuota) {
    const activeInvite = invitesThisMonth.find((i) => i.usedById === null);
    if (activeInvite) {
      return NextResponse.json({ code: activeInvite.code, reused: true });
    }
    return NextResponse.json(
      { error: "Você já atingiu o limite de convites deste mês." },
      { status: 429 }
    );
  }

  const invite = await prisma.invite.create({
    data: { code: generateCode(), createdById: session.sub },
  });

  // Consumo dos slots: primeiro a cota mensal, depois os convites bônus.
  if (!isAdmin) {
    const slotUsed = invitesThisMonth.length + 1; // slot (1-based) ocupado por este convite
    if (slotUsed > regularQuota && promoBonus > 0) {
      await prisma.user.update({
        where: { id: session.sub },
        data: { bonusInvites: { decrement: 1 } },
      });
    }
  }

  return NextResponse.json({ code: invite.code, reused: false }, { status: 201 });
}
