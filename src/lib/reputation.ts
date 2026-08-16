import { prisma } from "@/lib/prisma";

const SCORE_FLOOR = 100;
const SCORE_BASE = 200;

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor(Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Aplica um evento de reputação imediato (ban/mute via admin).
 * Registra no log e atualiza o score com piso em SCORE_FLOOR.
 */
export async function applyEvent(
  userId: string,
  delta: number,
  reason: string,
  sourceUserId?: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { reputationScore: true },
    });
    if (!user) return;

    const newScore = Math.max(SCORE_FLOOR, user.reputationScore + delta);

    await tx.user.update({
      where: { id: userId },
      data: { reputationScore: newScore },
    });

    await tx.reputationEvent.create({
      data: { userId, delta, reason, sourceUserId },
    });
  });
}

/**
 * Recalcula o score de um único usuário do zero com base no estado atual do banco.
 * Chamado pelo cron noturno ou manualmente pelo admin.
 */
export async function recalculateScore(userId: string): Promise<number> {
  const now = new Date();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      createdAt: true,
      profileImageUrl: true,
      bio: true,
      city: true,
      createdCommunities: {
        select: {
          _count: { select: { members: true } },
        },
      },
    },
  });

  if (!user) return SCORE_BASE;

  const [
    memberCommunityCount,
    receivedDepoCount,
    sentDepoCount,
    commonBadges,
    rareBadges,
    epicBadges,
    legendaryBadges,
  ] = await Promise.all([
    prisma.communityMember.count({ where: { userId, role: { not: "OWNER" } } }),
    prisma.depo.count({ where: { recipientId: userId, status: "APPROVED" } }),
    prisma.depo.count({ where: { authorId: userId, status: "APPROVED" } }),
    prisma.showcaseItem.count({ where: { userId, rarity: "common" } }),
    prisma.showcaseItem.count({ where: { userId, rarity: "rare" } }),
    prisma.showcaseItem.count({ where: { userId, rarity: "epic" } }),
    prisma.showcaseItem.count({ where: { userId, rarity: "legendary" } }),
  ]);

  let score = SCORE_BASE;

  // +20: perfil completo (foto + bio + cidade) — permanente enquanto completo
  if (user.profileImageUrl && user.bio && user.city) {
    score += 20;
  }

  // +60: conta com 180+ dias e sem incidentes no período
  const accountAgeDays = daysBetween(user.createdAt, now);
  if (accountAgeDays >= 180) {
    const incidents180 = await prisma.reputationEvent.count({
      where: {
        userId,
        delta: { lt: 0 },
        createdAt: { gte: daysAgo(180) },
      },
    });
    if (incidents180 === 0) score += 60;
  }

  // +50: 30 dias corridos sem nenhum evento negativo na rede
  const incidents30 = await prisma.reputationEvent.count({
    where: {
      userId,
      delta: { lt: 0 },
      createdAt: { gte: daysAgo(30) },
    },
  });
  if (incidents30 === 0) score += 50;

  // +10 por comunidade criada
  score += user.createdCommunities.length * 10;

  // +5 por comunidade que é membro (não criador)
  score += memberCommunityCount * 5;

  // +8 por depo recebido e aprovado
  score += receivedDepoCount * 8;

  // +12 por depo enviado e aprovado pelo destinatário
  score += sentDepoCount * 12;

  // Badges
  score += commonBadges * 5;
  score += rareBadges * 10;
  score += epicBadges * 15;
  score += legendaryBadges * 20;

  // Afiliados/convidados não entram mais no cálculo de reputação
  // (removido em 2026-05-23): nem bônus por presença, nem penalidade por ausência.

  const finalScore = Math.max(SCORE_FLOOR, Math.min(1000, score));

  await prisma.user.update({
    where: { id: userId },
    data: { reputationScore: finalScore },
  });

  return finalScore;
}

/**
 * Recalcula o score de todos os usuários ativos.
 * Chamado pelo cron noturno.
 */
export async function recalculateAll(): Promise<void> {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true },
  });

  for (const user of users) {
    await recalculateScore(user.id);
  }
}

// ─── Helpers de consulta ────────────────────────────────────────────────────

export function getReputationTier(score: number): string {
  if (score >= 900) return "Lenda do tecê";
  if (score >= 700) return "OG";
  if (score >= 500) return "tecê raiz";
  if (score >= 200) return "Genin";
  return "NPC";
}

export function getMonthlyInviteQuota(score: number): number {
  if (score >= 900) return 3;
  if (score >= 700) return 2;
  if (score >= 200) return 1;
  return 0;
}

export function canSendFriendRequest(score: number): boolean {
  return score >= 200;
}

export function canCreateCommunity(score: number): boolean {
  return score >= 200;
}

export function canShareLinks(score: number): boolean {
  return score >= 200;
}
