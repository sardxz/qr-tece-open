import Link from "next/link";
import { prisma } from "@/lib/prisma";
import BadgeGrantForm from "@/components/admin/BadgeGrantForm";
import { MetricTooltip } from "@/components/admin/MetricTooltip";
import {
  getCohortRetention,
  getDauMauStickiness,
  getActivityDistribution,
  getCommunityHealth,
  getGraphDensity,
  getActivationFunnel,
  getTopGodparents,
} from "@/lib/admin-metrics";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ periodo?: string }> };

export default async function AdminPage({ searchParams }: Props) {
  const { periodo } = await searchParams;
  const periodDays = [7, 14, 30].includes(Number(periodo)) ? Number(periodo) : 7;

  const now = new Date();
  const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [
    // Totais absolutos
    userCount,
    communityCount,
    postCount,
    commentCount,
    pendingDeposCount,
    unusedInvites,
    // Atividade no período
    newUsersPeriod,
    activeUsersPeriod,
    postsPeriod,
    invitesGeneratedPeriod,
    invitesUsedPeriod,
    activeUsers24h,
    // Convites
    godparentsData,
    // Métricas
    completeProfiles,
    totalDepos,
    approvedDepos,
    // Geografia
    byState,
    byCity,
    // Horários de pico
    recentPosts,
    // Novas métricas
    dauMauData,
    cohortData,
    distributionData,
    communityHealth,
    graphDensity,
    activationFunnel,
  ] = await Promise.all([
    // Totais
    prisma.user.count(),
    prisma.community.count(),
    prisma.post.count({ where: { replyToId: null } }),
    prisma.post.count({ where: { replyToId: { not: null } } }),
    prisma.depo.count({ where: { status: "PENDING" } }),
    prisma.invite.count({ where: { usedById: null } }),
    // Atividade no período
    prisma.user.count({ where: { createdAt: { gte: periodStart } } }),
    prisma.user.count({ where: { lastActiveAt: { gte: periodStart } } }),
    prisma.post.count({ where: { createdAt: { gte: periodStart }, replyToId: null } }),
    prisma.invite.count({ where: { createdAt: { gte: periodStart } } }),
    prisma.invite.count({ where: { createdAt: { gte: periodStart }, usedById: { not: null } } }),
    prisma.user.count({ where: { lastActiveAt: { gte: last24h } } }),
    // Convites (top padrinhos por qualidade)
    getTopGodparents(),
    // Métricas
    prisma.user.count({
      where: { profileImageUrl: { not: null }, bio: { not: null }, city: { not: null } },
    }),
    prisma.depo.count(),
    prisma.depo.count({ where: { status: "APPROVED" } }),
    // Geografia por estado
    prisma.user.groupBy({
      by: ["state"],
      where: { state: { not: null } },
      _count: { state: true },
      orderBy: { _count: { state: "desc" } },
      take: 10,
    }),
    // Geografia por cidade
    prisma.user.groupBy({
      by: ["city", "state"],
      where: { city: { not: null } },
      _count: { city: true },
      orderBy: { _count: { city: "desc" } },
      take: 10,
    }),
    // Horários de pico
    prisma.post.findMany({
      where: { createdAt: { gte: periodStart }, replyToId: null },
      select: { createdAt: true },
    }),
    // Novas métricas
    getDauMauStickiness(),
    getCohortRetention(),
    getActivityDistribution(periodStart),
    getCommunityHealth(periodStart),
    getGraphDensity(),
    getActivationFunnel(),
  ]);

  // Horários de pico
  const hourCounts: Record<number, number> = {};
  recentPosts.forEach((p) => {
    const h = p.createdAt.getHours();
    hourCounts[h] = (hourCounts[h] || 0) + 1;
  });
  const peakHours = Object.entries(hourCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([hour, count]) => ({ hour: Number(hour), count }));

  // Métricas calculadas
  const conversionRate = invitesGeneratedPeriod > 0
    ? Math.round((invitesUsedPeriod / invitesGeneratedPeriod) * 100)
    : 0;
  const profileRate = userCount > 0 ? Math.round((completeProfiles / userCount) * 100) : 0;
  const depoApprovalRate = totalDepos > 0 ? Math.round((approvedDepos / totalDepos) * 100) : 0;

  const usersWithLocation = byState.reduce((acc, s) => acc + s._count.state, 0);
  const maxStateCount = byState[0]?._count.state ?? 1;

  const formatHour = (h: number) => `${String(h).padStart(2, "0")}h`;
  const periodLabel = `${periodDays}D`;

  const stickinessColor =
    dauMauData.stickiness >= 40 ? "#22c55e" : dauMauData.stickiness >= 20 ? "#f59e0b" : "#ef4444";

  const retentionCellColor = (pct: number): string => {
    if (pct > 60) return "rgba(34, 197, 94, 0.55)";
    if (pct >= 40) return "rgba(34, 197, 94, 0.28)";
    if (pct >= 20) return "rgba(245, 158, 11, 0.32)";
    return "rgba(239, 68, 68, 0.28)";
  };

  const formatCohortLabel = (iso: string) => {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y.slice(2)}`;
  };

  const sparklineMax = Math.max(1, ...dauMauData.dauSeries);
  const sparklinePoints = dauMauData.dauSeries
    .map((v, i) => {
      const x = (i / Math.max(1, dauMauData.dauSeries.length - 1)) * 200;
      const y = 40 - (v / sparklineMax) * 40;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  // Absolute DAU delta display
  const dauDeltaColor = dauMauData.dauDeltaAbs > 0 ? "#22c55e" : dauMauData.dauDeltaAbs < 0 ? "#ef4444" : "var(--color-text-muted)";
  const dauDeltaSign = dauMauData.dauDeltaAbs > 0 ? "+" : "";

  const formatDelta = (delta: number) => {
    if (delta === 0) return "→ 0%";
    const arrow = delta > 0 ? "↑" : "↓";
    return `${arrow} ${Math.abs(delta)}%`;
  };
  const deltaColor = (delta: number) =>
    delta > 0 ? "#22c55e" : delta < 0 ? "#ef4444" : "var(--color-text-muted)";

  const maxCohortWeeks = 8;
  const totalActiveBucketUsers = distributionData.totalActiveUsers;
  const maxPostsBucket = Math.max(1, ...distributionData.postsBuckets.map((b) => b.users));
  const maxCommunitiesBucket = Math.max(1, ...distributionData.communitiesBuckets.map((b) => b.users));

  // Saúde de comunidades
  const totalCommunitiesForBuckets = communityHealth.sizeBuckets.reduce((sum, b) => sum + b.users, 0);
  const maxSizeBucket = Math.max(1, ...communityHealth.sizeBuckets.map((b) => b.users));
  const maxTopActivity = Math.max(1, ...communityHealth.topByActivity.map((c) => c.posts));

  // Densidade do grafo
  const densityMax = Math.max(0.01, ...graphDensity.weeklySeries.map((w) => w.avgFriendships));
  const densityPoints = graphDensity.weeklySeries
    .map((w, i) => {
      const x = (i / Math.max(1, graphDensity.weeklySeries.length - 1)) * 200;
      const y = 48 - (w.avgFriendships / densityMax) * 48;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const lastDensity = graphDensity.weeklySeries.at(-1)?.avgFriendships ?? 0;
  const trendArrow = graphDensity.trend === "up" ? "↑" : graphDensity.trend === "down" ? "↓" : "→";
  const trendColor =
    graphDensity.isInDecline
      ? "#ef4444"
      : graphDensity.trend === "up"
      ? "#22c55e"
      : graphDensity.trend === "down"
      ? "#f59e0b"
      : "var(--color-text-muted)";

  // Funil
  const formatFunnelTime = (hours: number | null) => {
    if (hours === null) return "—";
    if (hours < 1) return `${Math.round(hours * 60)}min`;
    if (hours < 48) return `${hours}h`;
    return `${Math.round(hours / 24)}d`;
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Cabeçalho + Filtro de período */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold m-0" style={{ color: "var(--color-text)", fontFamily: "var(--font-display)" }}>
            admin
          </h1>
          <p className="mt-0.5 text-sm m-0" style={{ color: "var(--color-text-muted)" }}>
            visão geral da plataforma
          </p>
        </div>
        <div className="flex gap-2">
          {[7, 14, 30].map((d) => (
            <Link
              key={d}
              href={`/admin?periodo=${d}`}
              className="text-xs font-black px-3 py-1.5 rounded-full no-underline transition-colors"
              style={
                periodDays === d
                  ? { background: "var(--color-tece-500)", color: "#fff" }
                  : { background: "var(--color-surface)", color: "var(--color-text-muted)", border: "1px solid var(--color-border)" }
              }
            >
              {d}D
            </Link>
          ))}
        </div>
      </div>

      {/* Totais absolutos */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-black uppercase tracking-wider m-0" style={{ color: "var(--color-text-muted)" }}>
          totais
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            { label: "usuários", value: userCount, href: "/admin/usuarios" },
            { label: "comunidades", value: communityCount, href: "/admin/comunidades" },
            { label: "posts", value: postCount, href: "#" },
            { label: "respostas", value: commentCount, href: "#" },
            { label: "depos pendentes", value: pendingDeposCount, href: "#" },
            { label: "convites disponíveis", value: unusedInvites, href: "/admin/convites" },
          ].map((stat) => (
            <Link key={stat.label} href={stat.href} className="card flex flex-col gap-1 p-4 transition-shadow hover:shadow-md no-underline">
              <span className="text-3xl font-bold" style={{ color: "var(--color-tece-600)", fontFamily: "var(--font-display)" }}>
                {stat.value}
              </span>
              <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{stat.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Saúde da rede — DAU / MAU / Stickiness */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-black uppercase tracking-wider m-0" style={{ color: "var(--color-text-muted)" }}>
          saúde da rede
        </h2>
        <div className="card p-5 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {/* DAU */}
            <div className="flex flex-col gap-1">
              <span className="text-2xl font-black" style={{ color: "var(--color-text)", fontFamily: "var(--font-display)" }}>
                {dauMauData.dau}
              </span>
              <span className="text-xs flex items-center" style={{ color: "var(--color-text-muted)" }}>
                DAU — ativos 24h
                <MetricTooltip text="Quantas pessoas diferentes abriram o app nas últimas 24 horas. É o sinal mais imediato de uso. Se cair vários dias seguidos, tem algo errado." />
              </span>
              <span className="text-xs font-black" style={{ color: dauDeltaColor }}>
                {dauDeltaSign}{dauMauData.dauDeltaAbs} vs ontem
              </span>
              {dauMauData.previousDau >= 10 && (
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  média 7d: {dauMauData.dau7dAvg}
                </span>
              )}
            </div>
            {/* WAU */}
            <div className="flex flex-col gap-1">
              <span className="text-2xl font-black" style={{ color: "var(--color-text)", fontFamily: "var(--font-display)" }}>
                {dauMauData.wau}
              </span>
              <span className="text-xs flex items-center" style={{ color: "var(--color-text-muted)" }}>
                WAU — ativos 7d
                <MetricTooltip text="Quantas pessoas diferentes usaram o app nos últimos 7 dias. Filtra o ruído do dia a dia e mostra o engajamento semanal real." />
              </span>
            </div>
            {/* MAU */}
            <div className="flex flex-col gap-1">
              <span className="text-2xl font-black" style={{ color: "var(--color-text)", fontFamily: "var(--font-display)" }}>
                {dauMauData.mau}
              </span>
              <span className="text-xs flex items-center" style={{ color: "var(--color-text-muted)" }}>
                MAU — ativos 30d
                <MetricTooltip text="Quantas pessoas diferentes usaram o app nos últimos 30 dias. É o tamanho real da sua base ativa — quem não apareceu em 30 dias está virtualmente perdido." />
              </span>
              {dauMauData.mauDelta !== null ? (
                <span className="text-xs font-black" style={{ color: deltaColor(dauMauData.mauDelta) }}>
                  {formatDelta(dauMauData.mauDelta)} vs 30d anterior
                </span>
              ) : (
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>— sem base de comparação</span>
              )}
            </div>
            {/* Stickiness DAU/MAU */}
            <div className="flex flex-col gap-1">
              <span className="text-3xl font-black" style={{ color: stickinessColor, fontFamily: "var(--font-display)" }}>
                {dauMauData.stickiness}%
              </span>
              <span className="text-xs font-black flex items-center" style={{ color: "var(--color-text)" }}>
                stickiness DAU/MAU
                <MetricTooltip text="De cada 100 pessoas que usaram o app no último mês, quantas voltaram hoje. Referência: 20-40% é decente, acima de 40% é viciante (Instagram fica em ~50%). Mostra se o app é hábito ou novidade passageira." />
              </span>
            </div>
          </div>
          {/* Stickiness DAU/WAU e WAU/MAU */}
          <div className="grid grid-cols-2 gap-3 pt-1 border-t" style={{ borderColor: "var(--color-border)" }}>
            <div className="flex flex-col gap-0.5">
              <span className="text-xl font-black" style={{ color: "var(--color-tece-cyan)", fontFamily: "var(--font-display)" }}>
                {dauMauData.dauWauStickiness}%
              </span>
              <span className="text-xs flex items-center" style={{ color: "var(--color-text-muted)" }}>
                DAU/WAU
                <MetricTooltip text="De cada 100 pessoas ativas na última semana, quantas voltaram hoje. Mede frequência: alto valor = quem usa, usa muito." />
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xl font-black" style={{ color: "var(--color-tece-blue)", fontFamily: "var(--font-display)" }}>
                {dauMauData.wauMauStickiness}%
              </span>
              <span className="text-xs flex items-center" style={{ color: "var(--color-text-muted)" }}>
                WAU/MAU
                <MetricTooltip text="De cada 100 pessoas ativas no último mês, quantas estiveram ativas na última semana. Mede lealdade: alto valor = quem fica no mês fica engajado." />
              </span>
            </div>
          </div>
          {/* Sparkline */}
          <div className="flex flex-col gap-1">
            <span className="text-xs flex items-center" style={{ color: "var(--color-text-muted)" }}>
              DAU desde {dauMauData.dauSeriesStartDate} (pico: {sparklineMax})
              <MetricTooltip text="Quantas pessoas únicas abriram o app a cada dia, desde o lançamento. Olha a tendência geral — picos podem indicar lançamentos de feature ou eventos." />
            </span>
            <svg width="100%" height="48" viewBox="0 0 200 48" preserveAspectRatio="none" style={{ display: "block" }}>
              <polyline
                points={sparklinePoints}
                fill="none"
                stroke="var(--color-tece-cyan)"
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>
        </div>
      </section>

      {/* Atividade no período */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-black uppercase tracking-wider m-0" style={{ color: "var(--color-text-muted)" }}>
          atividade — últimos {periodLabel}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "novos usuários", value: newUsersPeriod, color: "#22c55e" },
            { label: "usuários ativos", value: activeUsersPeriod, color: "#22c55e" },
            { label: "ativos hoje", value: activeUsers24h, color: "#22c55e" },
            { label: "posts publicados", value: postsPeriod, color: "#22c55e" },
            { label: "convites gerados", value: invitesGeneratedPeriod, color: "#22c55e" },
            { label: `convertidos (${conversionRate}%)`, value: invitesUsedPeriod, color: conversionRate >= 50 ? "#22c55e" : "#f97316" },
          ].map((stat) => (
            <div key={stat.label} className="card flex flex-col gap-1 p-4">
              <span className="text-2xl font-bold" style={{ color: stat.color, fontFamily: "var(--font-display)" }}>
                {stat.value}
              </span>
              <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Convites */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-black uppercase tracking-wider m-0" style={{ color: "var(--color-text-muted)" }}>
          convites
        </h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Top padrinhos — ranking por qualidade */}
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b" style={{ borderColor: "var(--color-border)" }}>
              <p className="m-0 text-sm font-black flex items-center" style={{ color: "var(--color-text)" }}>
                top padrinhos
                <MetricTooltip text="Ranqueado por qualidade, não por quantidade. 'Score' combina quantos trouxe com quantos ficaram ativos. Padrinho que traz pouco mas todo mundo fica vale mais que quem traz muito e perde metade." />
              </p>
              <p className="m-0 text-xs" style={{ color: "var(--color-text-muted)" }}>ranking por score de qualidade</p>
            </div>

            {godparentsData.godparents.length === 0 ? (
              <p className="px-5 py-4 text-sm m-0" style={{ color: "var(--color-text-muted)" }}>nenhum dado ainda</p>
            ) : (
              <>
                {/* Cabeçalho de colunas */}
                <div
                  className="grid grid-cols-[18px_1fr_auto_auto_auto] gap-3 px-5 py-2 border-b text-[10px] font-black uppercase tracking-wider"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
                >
                  <span>#</span>
                  <span>padrinho</span>
                  <span className="text-right">trouxe</span>
                  <span className="flex items-center justify-end text-right">
                    retidos 14d
                    <MetricTooltip text="De cada pessoa que esse padrinho trouxe, quantas ainda estavam ativas nos últimos 14 dias." />
                  </span>
                  <span className="flex items-center justify-end text-right">
                    score
                    <MetricTooltip text="Combina quantidade e qualidade. Fórmula: retenção × log(total trazido). Cresce quando você traz mais gente E essa gente fica." />
                  </span>
                </div>
                <div className="divide-y" style={{ borderColor: "var(--color-border)" }}>
                  {godparentsData.godparents.map((g, i) => (
                    <div key={g.username} className="grid grid-cols-[18px_1fr_auto_auto_auto] items-center gap-3 px-5 py-3">
                      <span className="text-xs font-black" style={{ color: "var(--color-text-muted)" }}>{i + 1}</span>
                      <Link href={`/perfil/${g.username}`} className="truncate text-sm font-bold no-underline hover:underline" style={{ color: "var(--color-text)" }}>
                        @{g.username}
                      </Link>
                      <span className="text-right text-sm font-black" style={{ color: "var(--color-text)" }}>{g.brought}</span>
                      <span className="text-right text-sm font-bold" style={{ color: "var(--color-text-muted)" }}>
                        {g.retained14d} ({g.retentionPct}%)
                      </span>
                      <span className="text-right text-sm font-black" style={{ color: "var(--color-tece-500)" }}>{g.score}</span>
                    </div>
                  ))}
                </div>
                {/* Alerta de concentração */}
                <div className="px-5 py-3 border-t" style={{ borderColor: "var(--color-border)" }}>
                  {godparentsData.isConcentrated ? (
                    <p className="m-0 text-xs font-bold" style={{ color: "#f59e0b" }}>
                      ⚠ {godparentsData.concentrationPct}% dos cadastros vieram de 3 padrinhos — a rede depende de poucos disseminadores
                    </p>
                  ) : (
                    <p className="m-0 text-xs font-bold" style={{ color: "#22c55e" }}>
                      ✓ Propagação distribuída — sem dependência excessiva de poucos padrinhos
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Métricas da plataforma */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-black uppercase tracking-wider m-0" style={{ color: "var(--color-text-muted)" }}>
          métricas da plataforma
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="card p-5 flex flex-col gap-2">
            <div className="flex items-end gap-2">
              <span className="text-3xl font-black" style={{ color: "var(--color-tece-500)", fontFamily: "var(--font-display)" }}>
                {profileRate}%
              </span>
              <span className="text-sm mb-0.5" style={{ color: "var(--color-text-muted)" }}>perfis completos</span>
            </div>
            <p className="m-0 text-xs" style={{ color: "var(--color-text-muted)" }}>
              {completeProfiles} de {userCount} usuários têm foto + bio + cidade
            </p>
            <div className="h-1.5 rounded-full overflow-hidden mt-1" style={{ background: "var(--color-border)" }}>
              <div className="h-full rounded-full" style={{ width: `${profileRate}%`, background: "var(--color-tece-500)" }} />
            </div>
          </div>

          <div className="card p-5 flex flex-col gap-2">
            <div className="flex items-end gap-2">
              <span className="text-3xl font-black" style={{ color: "#22c55e", fontFamily: "var(--font-display)" }}>
                {depoApprovalRate}%
              </span>
              <span className="text-sm mb-0.5" style={{ color: "var(--color-text-muted)" }}>depos aprovados</span>
            </div>
            <p className="m-0 text-xs" style={{ color: "var(--color-text-muted)" }}>
              {approvedDepos} aprovados de {totalDepos} enviados
            </p>
            <div className="h-1.5 rounded-full overflow-hidden mt-1" style={{ background: "var(--color-border)" }}>
              <div className="h-full rounded-full" style={{ width: `${depoApprovalRate}%`, background: "#22c55e" }} />
            </div>
          </div>

        </div>
      </section>

      {/* Densidade do grafo social */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-black uppercase tracking-wider m-0" style={{ color: "var(--color-text-muted)" }}>
          densidade do grafo social
        </h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Gráfico de linha — média 8 semanas */}
          <div className="card p-5 flex flex-col gap-3 lg:col-span-1">
            <div>
              <p className="m-0 text-sm font-black flex items-center" style={{ color: "var(--color-text)" }}>
                amigos por usuário ativo
                <MetricTooltip text="Em média, quantos amigos cada pessoa ativa tem na rede. Se esse número cair com o crescimento, é alerta: significa que novos entrantes não estão conectando." />
              </p>
              <p className="m-0 text-xs" style={{ color: "var(--color-text-muted)" }}>média semanal — últimas 8 semanas</p>
            </div>
            <div className="flex items-end gap-3">
              <span className="text-3xl font-black" style={{ color: "var(--color-tece-blue)", fontFamily: "var(--font-display)" }}>
                {lastDensity}
              </span>
              <span className="text-sm font-black mb-1" style={{ color: trendColor }}>
                {trendArrow} {graphDensity.weeklyDelta > 0 ? "+" : ""}{graphDensity.weeklyDelta}%
              </span>
            </div>
            <svg width="100%" height="56" viewBox="0 0 200 56" preserveAspectRatio="none" style={{ display: "block" }}>
              <polyline
                points={densityPoints}
                fill="none"
                stroke={graphDensity.isInDecline ? "#ef4444" : "var(--color-tece-blue)"}
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            {graphDensity.isInDecline ? (
              <p className="m-0 text-xs font-black" style={{ color: "#ef4444" }}>
                ⚠ em queda há 2+ semanas seguidas
              </p>
            ) : null}
          </div>

          {/* % sem amigos */}
          <div className="card p-5 flex flex-col gap-2">
            <div className="flex items-end gap-2">
              <span className="text-3xl font-black" style={{ color: "#f59e0b", fontFamily: "var(--font-display)" }}>
                {graphDensity.usersWithNoFriendsPct}%
              </span>
              <span className="text-sm mb-0.5 flex items-center" style={{ color: "var(--color-text-muted)" }}>
                sem amizades
                <MetricTooltip text="Usuários ativos que não têm nenhuma amizade aceita. São candidatos a sair — quem usa sozinho geralmente desiste." />
              </span>
            </div>
            <p className="m-0 text-xs" style={{ color: "var(--color-text-muted)" }}>
              {graphDensity.usersWithNoFriends} de {graphDensity.totalActive30d} ativos (30d) sem nenhuma amizade aceita
            </p>
            <p className="m-0 text-xs" style={{ color: "var(--color-text-muted)" }}>
              esse número precisa cair com o tempo.
            </p>
          </div>

          {/* % sem depo */}
          <div className="card p-5 flex flex-col gap-2">
            <div className="flex items-end gap-2">
              <span className="text-3xl font-black" style={{ color: "var(--color-tece-pink)", fontFamily: "var(--font-display)" }}>
                {graphDensity.usersWithNoDeposPct}%
              </span>
              <span className="text-sm mb-0.5 flex items-center" style={{ color: "var(--color-text-muted)" }}>
                sem depo recebido
                <MetricTooltip text="Usuários ativos que ninguém ainda escreveu um depo. Depo é sinal de pertencimento; quem nunca recebeu pode estar se sentindo invisível." />
              </span>
            </div>
            <p className="m-0 text-xs" style={{ color: "var(--color-text-muted)" }}>
              {graphDensity.usersWithNoDepos} de {graphDensity.totalActive30d} ativos (30d) sem nenhum depo aprovado
            </p>
            <p className="m-0 text-xs" style={{ color: "var(--color-text-muted)" }}>
              indicador de pertencimento na rede.
            </p>
          </div>
        </div>
      </section>

      {/* Geografia */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-black uppercase tracking-wider m-0 flex items-center" style={{ color: "var(--color-text-muted)" }}>
          geografia — {usersWithLocation} de {userCount} usuários com localização
          <MetricTooltip text="De onde vem a base. Concentração em uma região ajuda na sensação de proximidade entre usuários (clima local, gírias, etc). Dispersão dilui essa sensação mas amplia o alcance." />
        </h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Por estado */}
          <div className="card p-5 flex flex-col gap-3">
            <p className="m-0 text-sm font-black" style={{ color: "var(--color-text)" }}>por estado</p>
            {byState.length === 0 ? (
              <p className="m-0 text-sm" style={{ color: "var(--color-text-muted)" }}>nenhum dado ainda</p>
            ) : byState.map((s) => (
              <div key={s.state} className="flex items-center gap-3">
                <span className="text-xs font-black w-8 flex-shrink-0" style={{ color: "var(--color-text-muted)" }}>
                  {s.state}
                </span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(s._count.state / maxStateCount) * 100}%`, background: "var(--color-tece-cyan)" }}
                  />
                </div>
                <span className="text-xs font-black w-6 text-right flex-shrink-0" style={{ color: "var(--color-text)" }}>
                  {s._count.state}
                </span>
              </div>
            ))}
          </div>

          {/* Por cidade */}
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b" style={{ borderColor: "var(--color-border)" }}>
              <p className="m-0 text-sm font-black" style={{ color: "var(--color-text)" }}>por cidade</p>
            </div>
            <div className="divide-y" style={{ borderColor: "var(--color-border)" }}>
              {byCity.length === 0 ? (
                <p className="px-5 py-4 text-sm m-0" style={{ color: "var(--color-text-muted)" }}>nenhum dado ainda</p>
              ) : byCity.map((c, i) => (
                <div key={`${c.city}-${c.state}`} className="flex items-center justify-between px-5 py-2.5">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black w-5 flex-shrink-0" style={{ color: "var(--color-text-muted)" }}>#{i + 1}</span>
                    <span className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
                      {c.city}{c.state ? `, ${c.state}` : ""}
                    </span>
                  </div>
                  <span className="text-sm font-black" style={{ color: "var(--color-tece-500)" }}>
                    {c._count.city}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Horários de pico */}
      {peakHours.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-black uppercase tracking-wider m-0" style={{ color: "var(--color-text-muted)" }}>
            horários de pico — últimos {periodLabel}
          </h2>
          <div className="card flex flex-col gap-3 p-5">
            {peakHours.map((p, i) => (
              <div key={p.hour} className="flex items-center gap-4">
                <span className="w-8 text-sm font-black" style={{ color: "var(--color-text-muted)" }}>#{i + 1}</span>
                <span className="w-10 text-sm font-black" style={{ color: "var(--color-text)" }}>{formatHour(p.hour)}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full" style={{ background: "var(--color-border)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(p.count / (peakHours[0]?.count || 1)) * 100}%`, background: "var(--color-tece-cyan)" }}
                  />
                </div>
                <span className="w-16 text-right text-xs font-bold" style={{ color: "var(--color-text-muted)" }}>
                  {p.count} post{p.count !== 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Comunidades — saúde */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-black uppercase tracking-wider m-0" style={{ color: "var(--color-text-muted)" }}>
          comunidades — saúde
        </h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Card 1 — Distribuição de tamanho */}
          <div className="card p-5 flex flex-col gap-3">
            <div>
              <p className="m-0 text-sm font-black flex items-center" style={{ color: "var(--color-text)" }}>
                distribuição de tamanho
                <MetricTooltip text="Quantos membros cada comunidade tem. Muitas comunidades com 1 membro = gente criando sem trazer ninguém. Muitas grandes = a rede tem espaços que funcionam." />
              </p>
              <p className="m-0 text-xs" style={{ color: "var(--color-text-muted)" }}>
                {communityHealth.totalCommunities} comunidades no total
              </p>
            </div>
            {communityHealth.sizeBuckets.map((b) => {
              const bucketPct = totalCommunitiesForBuckets > 0 ? Math.round((b.users / totalCommunitiesForBuckets) * 100) : 0;
              return (
                <div key={b.bucket} className="flex items-center gap-3">
                  <span className="w-14 text-xs font-black flex-shrink-0" style={{ color: "var(--color-text-muted)" }}>
                    {b.bucket}
                  </span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(b.users / maxSizeBucket) * 100}%`, background: "var(--color-tece-cyan)" }}
                    />
                  </div>
                  <span className="w-16 text-right text-xs font-black flex-shrink-0" style={{ color: "var(--color-text)" }}>
                    {b.users} ({bucketPct}%)
                  </span>
                </div>
              );
            })}
          </div>

          {/* Card 2 — Atividade */}
          <div className="card p-5 flex flex-col gap-3">
            <div>
              <p className="m-0 text-sm font-black flex items-center" style={{ color: "var(--color-text)" }}>
                atividade das comunidades
                <MetricTooltip text="Comunidades que tiveram pelo menos um post na última semana. Comunidades silenciosas há muito tempo são candidatas a desativar — afetam a primeira impressão de quem entra." />
              </p>
              <p className="m-0 text-xs" style={{ color: "var(--color-text-muted)" }}>posts publicados no espaço da comu</p>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm" style={{ color: "var(--color-text)" }}>com post nos últimos 7 dias</span>
                <span className="text-xl font-black" style={{ color: "#22c55e", fontFamily: "var(--font-display)" }}>
                  {communityHealth.active7d}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-sm" style={{ color: "var(--color-text)" }}>silenciosas há 14d+</span>
                <span className="text-xl font-black" style={{ color: "#f59e0b", fontFamily: "var(--font-display)" }}>
                  {communityHealth.silent14d}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-sm" style={{ color: "var(--color-text)" }}>silenciosas há 30d+</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-black" style={{ color: "#ef4444", fontFamily: "var(--font-display)" }}>
                    {communityHealth.silent30d}
                  </span>
                  <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>candidatas a archive</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3 — Top por atividade no período */}
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b" style={{ borderColor: "var(--color-border)" }}>
              <p className="m-0 text-sm font-black flex items-center" style={{ color: "var(--color-text)" }}>
                top por atividade ({periodLabel})
                <MetricTooltip text="Ranqueado pelo número de posts, não de membros. Comunidade pequena e ativa vale mais que grande e parada. Posts/membro mostra qual delas realmente vive." />
              </p>
              <p className="m-0 text-xs" style={{ color: "var(--color-text-muted)" }}>ranking por posts no período, não por tamanho</p>
            </div>
            <div className="divide-y" style={{ borderColor: "var(--color-border)" }}>
              {communityHealth.topByActivity.length === 0 ? (
                <p className="px-5 py-4 text-sm m-0" style={{ color: "var(--color-text-muted)" }}>nenhum dado ainda</p>
              ) : communityHealth.topByActivity.map((c, i) => (
                <div key={c.slug} className="px-5 py-3 flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-black flex-shrink-0" style={{ color: "var(--color-text-muted)" }}>#{i + 1}</span>
                      <Link href={`/comunidades/${c.slug}`} className="text-sm font-black no-underline hover:underline truncate" style={{ color: "var(--color-tece-600)" }}>
                        {c.name}
                      </Link>
                    </div>
                    <span className="text-sm font-black flex-shrink-0" style={{ color: "var(--color-text)" }}>
                      {c.posts} {c.posts === 1 ? "post" : "posts"}
                    </span>
                  </div>
                  <div className="flex gap-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
                    <span>{c.members} membros</span>
                    <span>·</span>
                    <span>{c.postsPerMember} posts/membro</span>
                    <div className="flex-1 h-1 rounded-full overflow-hidden self-center" style={{ background: "var(--color-border)" }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(c.posts / maxTopActivity) * 100}%`, background: "var(--color-tece-500)" }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Retenção por coorte */}
      {cohortData.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-black uppercase tracking-wider m-0 flex items-center" style={{ color: "var(--color-text-muted)" }}>
            retenção por coorte
            <MetricTooltip text="Cada linha é um grupo de pessoas que se cadastrou na mesma semana. As colunas mostram quantas dessas pessoas ainda estavam ativas semana após semana. Retenção alta significa que o produto está fazendo sentido pra quem entra." />
          </h2>
          <div className="card overflow-x-auto p-0">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <th className="px-3 py-2 text-left font-black uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                    coorte
                  </th>
                  {Array.from({ length: maxCohortWeeks }, (_, i) => (
                    <th key={i} className="px-2 py-2 text-center font-black" style={{ color: "var(--color-text-muted)" }}>
                      <span className="flex items-center justify-center gap-0.5">
                        S{i + 1}
                        {i === 0 && <MetricTooltip text="S1 = semana 1 após o cadastro. S2 = semana 2. E assim por diante. O percentual mostra quantos da coorte continuaram ativos naquela semana. Células com '—' = a semana ainda não fechou pra essa coorte." />}
                      </span>
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right font-black uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                    <span className="flex items-center justify-end gap-0.5">
                      ativos hoje
                      <MetricTooltip text="Quantos da coorte original ainda estão ativos hoje (tiveram atividade nos últimos 7 dias). É o número que mais importa: se 89% da galera que entrou há 3 semanas ainda usa, o produto é forte." />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {cohortData.map((cohort) => {
                  const retentionMap = new Map(cohort.weekRetention.map((r) => [r.weekOffset, r]));
                  return (
                    <tr key={cohort.cohortWeek} style={{ borderBottom: "1px solid var(--color-border)" }}>
                      <td className="px-3 py-2 font-black" style={{ color: "var(--color-text)" }}>
                        {formatCohortLabel(cohort.cohortWeek)}
                        <span className="ml-1 font-normal" style={{ color: "var(--color-text-muted)" }}>
                          ({cohort.totalUsers})
                        </span>
                      </td>
                      {Array.from({ length: maxCohortWeeks }, (_, i) => {
                        const cell = retentionMap.get(i);
                        if (!cell) {
                          return (
                            <td key={i} className="px-2 py-2 text-center" style={{ color: "var(--color-border)" }}>
                              —
                            </td>
                          );
                        }
                        if (cell.inProgress) {
                          return (
                            <td key={i} className="px-2 py-2 text-center" style={{ color: "var(--color-text-muted)", fontStyle: "italic" }}
                              title="Semana em andamento — percentual ainda não é definitivo">
                              ~{cell.pct}%
                            </td>
                          );
                        }
                        return (
                          <td
                            key={i}
                            className="px-2 py-2 text-center font-black"
                            style={{ background: retentionCellColor(cell.pct), color: "var(--color-text)" }}
                            title={`${cell.activeCount} de ${cohort.totalUsers} ativos na semana ${i + 1}`}
                          >
                            {cell.pct}%
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-right">
                        {cohort.activeNowInProgress ? (
                          <span style={{ color: "var(--color-text-muted)", fontStyle: "italic" }} title="Coorte com menos de 7 dias — número em andamento">
                            ~{cohort.activeNow}
                          </span>
                        ) : (
                          <>
                            <span className="font-black" style={{ color: "var(--color-text)" }}>
                              {cohort.totalUsers} → {cohort.activeNow}
                            </span>
                            <span className="ml-1" style={{ color: "var(--color-text-muted)" }}>
                              ({cohort.activeNowPct}%)
                            </span>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Distribuição de atividade */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-black uppercase tracking-wider m-0" style={{ color: "var(--color-text-muted)" }}>
          distribuição de atividade — últimos {periodLabel}
        </h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Posts por usuário */}
          <div className="card p-5 flex flex-col gap-3">
            <div>
              <p className="m-0 text-sm font-black flex items-center" style={{ color: "var(--color-text)" }}>
                posts por usuário ativo
                <MetricTooltip text="Quantos posts cada pessoa ativa fez no período. Mostra se o uso é distribuído (muita gente postando pouco) ou concentrado (poucos postando muito). Distribuído é mais saudável — rede que depende de 3 pessoas postando é frágil." />
              </p>
              <p className="m-0 text-xs flex items-center gap-2" style={{ color: "var(--color-text-muted)" }}>
                <span>
                  mediana {distributionData.postsMedian}
                  <MetricTooltip text="Metade dos usuários ativos postou mais que esse número, metade postou menos. Diferente da média, não é puxado por quem posta muito." />
                </span>
                <span>·</span>
                <span>
                  p90 {distributionData.postsP90}
                  <MetricTooltip text="90% dos usuários ativos postou esse número de posts ou menos. Mostra o teto típico — quem está acima é power user." />
                </span>
              </p>
            </div>
            {distributionData.postsBuckets.map((b) => (
              <div key={b.bucket} className="flex items-center gap-3">
                <span className="w-14 text-xs font-black flex-shrink-0" style={{ color: "var(--color-text-muted)" }}>
                  {b.bucket}
                </span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(b.users / maxPostsBucket) * 100}%`, background: "var(--color-tece-500)" }}
                  />
                </div>
                <span className="w-10 text-right text-xs font-black flex-shrink-0" style={{ color: "var(--color-text)" }}>
                  {b.users}
                </span>
              </div>
            ))}
          </div>

          {/* Comunidades por usuário */}
          <div className="card p-5 flex flex-col gap-3">
            <div>
              <p className="m-0 text-sm font-black flex items-center" style={{ color: "var(--color-text)" }}>
                comunidades por usuário ativo
                <MetricTooltip text="De quantas comunidades cada pessoa ativa faz parte. Alto valor = comunidades são o coração da rede, gente engajada em vários espaços." />
              </p>
              <p className="m-0 text-xs" style={{ color: "var(--color-text-muted)" }}>
                mediana {distributionData.communitiesMedian}
              </p>
            </div>
            {distributionData.communitiesBuckets.map((b) => (
              <div key={b.bucket} className="flex items-center gap-3">
                <span className="w-14 text-xs font-black flex-shrink-0" style={{ color: "var(--color-text-muted)" }}>
                  {b.bucket}
                </span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(b.users / maxCommunitiesBucket) * 100}%`, background: "var(--color-tece-cyan)" }}
                  />
                </div>
                <span className="w-10 text-right text-xs font-black flex-shrink-0" style={{ color: "var(--color-text)" }}>
                  {b.users}
                </span>
              </div>
            ))}
          </div>

          {/* Concentração */}
          <div className="card p-5 flex flex-col gap-3">
            <div>
              <p className="m-0 text-sm font-black flex items-center" style={{ color: "var(--color-text)" }}>
                concentração
                <MetricTooltip text="Quanto da rede produz a maior parte do conteúdo. 11% / 50% significa que 11% dos usuários produzem metade dos posts. Quanto mais distribuído (perto de 50/50), mais saudável. Quanto mais concentrado (5%/80%), mais dependente de poucos." />
              </p>
              <p className="m-0 text-xs" style={{ color: "var(--color-text-muted)" }}>
                quanto da rede produz a maior parte do conteúdo
              </p>
            </div>
            {distributionData.concentrationUsersPct > 0 ? (
              <>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-black" style={{ color: "var(--color-tece-pink)", fontFamily: "var(--font-display)" }}>
                    {distributionData.concentrationUsersPct}%
                  </span>
                  <span className="text-sm mb-1" style={{ color: "var(--color-text-muted)" }}>dos usuários ativos</span>
                </div>
                <p className="m-0 text-sm" style={{ color: "var(--color-text)" }}>
                  produzem <span className="font-black">{distributionData.concentrationPostsPct}% dos posts</span> no período.
                </p>
                <p className="m-0 text-xs" style={{ color: "var(--color-text-muted)" }}>
                  baseado em {totalActiveBucketUsers} usuários ativos
                </p>
              </>
            ) : (
              <p className="m-0 text-sm" style={{ color: "var(--color-text-muted)" }}>
                sem posts no período
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Funil de ativação */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-black uppercase tracking-wider m-0 flex items-center" style={{ color: "var(--color-text-muted)" }}>
          funil de ativação — cadastros últimos 30d
          <MetricTooltip text="Acompanha o caminho de quem se cadastra: completou o perfil? Postou pela primeira vez? Fez amigo? Voltou no dia seguinte? Cada degrau perdido é gente que entrou e sumiu. O maior gargalo é o que mais importa corrigir." />
        </h2>
        <div className="card p-5 flex flex-col gap-3">
          <p className="m-0 text-xs" style={{ color: "var(--color-text-muted)" }}>
            {activationFunnel.totalSignups} usuários cadastraram nos últimos 30 dias
          </p>
          {activationFunnel.totalSignups === 0 ? (
            <p className="m-0 text-sm" style={{ color: "var(--color-text-muted)" }}>
              sem cadastros recentes pra calcular o funil.
            </p>
          ) : (
            <div className="flex flex-col gap-2 mt-1">
              {activationFunnel.steps.map((step, i) => {
                const isBiggestDrop = i === activationFunnel.biggestDropIndex && i > 0;
                const barColor = isBiggestDrop ? "#ef4444" : "var(--color-tece-500)";
                const labelColor = isBiggestDrop ? "#ef4444" : "var(--color-text)";
                const dropFromPrevious = i > 0 ? activationFunnel.steps[i - 1].pct - step.pct : 0;
                return (
                  <div key={step.label} className="flex flex-col gap-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-black flex-shrink-0" style={{ color: "var(--color-text-muted)" }}>
                          {i + 1}.
                        </span>
                        <span className="text-sm font-black" style={{ color: labelColor }}>
                          {step.label}
                        </span>
                        {isBiggestDrop ? (
                          <span className="text-xs font-black" style={{ color: "#ef4444" }}>
                            ⚠ maior gargalo (−{dropFromPrevious}pp)
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-baseline gap-3 flex-shrink-0">
                        <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                          {step.count} usuários
                        </span>
                        <span className="text-xs flex items-center" style={{ color: "var(--color-text-muted)" }}>
                          tempo: {formatFunnelTime(step.medianHours)}
                          {i === 1 && <MetricTooltip text="Quanto tempo, em mediana, leva entre o cadastro e a pessoa fazer aquela ação. Quanto menor, melhor — onboarding rápido = retenção mais alta." />}
                        </span>
                        <span className="text-lg font-black w-12 text-right" style={{ color: labelColor, fontFamily: "var(--font-display)" }}>
                          {step.pct}%
                        </span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${step.pct}%`, background: barColor }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Ações rápidas */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-black uppercase tracking-wider m-0" style={{ color: "var(--color-text-muted)" }}>
          ações rápidas
        </h2>
        <div className="card flex flex-col gap-2 p-5">
          {[
            { href: "/admin/atualizacoes", label: "Publicar atualizações" },
            { href: "/admin/convites", label: "Gerar convites" },
            { href: "/admin/usuarios", label: "Ver usuários" },
          ].map((action) => (
            <Link key={action.href} href={action.href} className="text-sm font-medium underline" style={{ color: "var(--color-tece-600)" }}>
              {"-> "}{action.label}
            </Link>
          ))}
        </div>
      </section>

      {/* Badges */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-black uppercase tracking-wider m-0" style={{ color: "var(--color-text-muted)" }}>
          badges
        </h2>
        <BadgeGrantForm />
      </section>
    </div>
  );
}
