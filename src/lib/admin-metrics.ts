import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const DAY_MS = 24 * 60 * 60 * 1000;

// ─── Tipos ─────────────────────────────────────────────────────────────────

export type CohortRow = {
  cohortWeek: string;
  totalUsers: number;
  weekRetention: Array<{ weekOffset: number; activeCount: number; pct: number; inProgress: boolean }>;
  activeNow: number;
  activeNowPct: number;
  activeNowInProgress: boolean;
};

export type DauMauResult = {
  dau: number;
  wau: number;
  mau: number;
  stickiness: number;
  dauWauStickiness: number;
  wauMauStickiness: number;
  dauSeries: number[];
  dauSeriesStartDate: string;
  previousDau: number;
  previousMau: number;
  dauDeltaAbs: number;
  dau7dAvg: number;
  mauDelta: number | null;
  productLaunchDate: string;
};

export type BucketRow = { bucket: string; users: number };

export type DistributionResult = {
  postsBuckets: BucketRow[];
  postsMedian: number;
  postsP90: number;
  communitiesBuckets: BucketRow[];
  communitiesMedian: number;
  concentrationUsersPct: number;
  concentrationPostsPct: number;
  totalActiveUsers: number;
};

// ─── Seção 1 — Retenção por coorte ────────────────────────────────────────

export async function getCohortRetention(): Promise<CohortRow[]> {
  type Row = {
    cohort_week: Date;
    total_users: bigint;
    week_offset: number | null;
    active_count: bigint | null;
    active_now: bigint;
  };

  const rows = await prisma.$queryRaw<Row[]>`
    WITH cohorts AS (
      SELECT
        date_trunc('week', "createdAt")::date AS cohort_week,
        id AS user_id,
        "createdAt" AS user_created_at
      FROM "User"
    ),
    activity AS (
      SELECT "authorId" AS user_id, "createdAt" FROM "Post"
      UNION ALL
      SELECT "userId", "createdAt" FROM "Like"
      UNION ALL
      SELECT "authorId", "createdAt" FROM "Comment"
      UNION ALL
      SELECT "authorId", "createdAt" FROM "Depo"
      UNION ALL
      SELECT "requesterId", "createdAt" FROM "Friendship"
      UNION ALL
      SELECT "userId", "createdAt" FROM "UserEvent"
    ),
    cohort_totals AS (
      SELECT
        c.cohort_week,
        COUNT(*)::bigint AS total_users,
        COUNT(DISTINCT CASE
          WHEN EXISTS (
            SELECT 1 FROM activity a
            WHERE a.user_id = c.user_id
              AND a."createdAt" >= now() - interval '7 days'
          ) THEN c.user_id
        END)::bigint AS active_now
      FROM cohorts c
      GROUP BY c.cohort_week
    ),
    weekly_activity AS (
      SELECT DISTINCT
        c.cohort_week,
        c.user_id,
        FLOOR(EXTRACT(EPOCH FROM (a."createdAt" - c.user_created_at)) / (86400 * 7))::int AS week_offset
      FROM cohorts c
      JOIN activity a
        ON a.user_id = c.user_id
       AND a."createdAt" >= c.user_created_at
      WHERE FLOOR(EXTRACT(EPOCH FROM (a."createdAt" - c.user_created_at)) / (86400 * 7)) BETWEEN 0 AND 7
    ),
    retention AS (
      SELECT
        cohort_week,
        week_offset,
        COUNT(DISTINCT user_id)::bigint AS active_count
      FROM weekly_activity
      GROUP BY cohort_week, week_offset
    )
    SELECT
      ct.cohort_week,
      ct.total_users,
      r.week_offset,
      r.active_count,
      ct.active_now
    FROM cohort_totals ct
    LEFT JOIN retention r ON r.cohort_week = ct.cohort_week
    ORDER BY ct.cohort_week DESC, r.week_offset ASC NULLS LAST
  `;

  const now = new Date();
  const byCohort = new Map<string, CohortRow>();

  for (const row of rows) {
    const key = row.cohort_week.toISOString().slice(0, 10);
    if (!byCohort.has(key)) {
      const totalUsers = Number(row.total_users);
      const activeNow = Number(row.active_now);
      const cohortDate = new Date(key);
      const activeNowInProgress = now.getTime() - cohortDate.getTime() < 7 * DAY_MS;
      byCohort.set(key, {
        cohortWeek: key,
        totalUsers,
        weekRetention: [],
        activeNow,
        activeNowPct: totalUsers > 0 ? Math.round((activeNow / totalUsers) * 100) : 0,
        activeNowInProgress,
      });
    }
    if (row.week_offset !== null && row.active_count !== null) {
      const cohort = byCohort.get(key)!;
      const activeCount = Number(row.active_count);
      const cohortDate = new Date(key);
      const windowEnd = new Date(cohortDate.getTime() + (row.week_offset + 1) * 7 * DAY_MS);
      const inProgress = windowEnd > now;
      cohort.weekRetention.push({
        weekOffset: row.week_offset,
        activeCount,
        pct: cohort.totalUsers > 0 ? Math.round((activeCount / cohort.totalUsers) * 100) : 0,
        inProgress,
      });
    }
  }

  return Array.from(byCohort.values());
}

// ─── Seção 2 — DAU/MAU/Stickiness + sparkline ─────────────────────────────

export async function getDauMauStickiness(): Promise<DauMauResult> {
  const now = new Date();
  const last24h = new Date(now.getTime() - DAY_MS);
  const last7d = new Date(now.getTime() - 7 * DAY_MS);
  const last30d = new Date(now.getTime() - 30 * DAY_MS);
  const previous24h = new Date(now.getTime() - 2 * DAY_MS);
  const previous30d = new Date(now.getTime() - 60 * DAY_MS);

  type SeriesRow = { day: Date; dau: bigint };

  const [dau, wau, mau, previousDau, previousMau, dauSeriesRaw, firstUser] = await Promise.all([
    prisma.user.count({ where: { lastActiveAt: { gte: last24h } } }),
    prisma.user.count({ where: { lastActiveAt: { gte: last7d } } }),
    prisma.user.count({ where: { lastActiveAt: { gte: last30d } } }),
    prisma.user.count({ where: { lastActiveAt: { gte: previous24h, lt: last24h } } }),
    prisma.user.count({ where: { lastActiveAt: { gte: previous30d, lt: last30d } } }),
    prisma.$queryRaw<SeriesRow[]>`
      WITH activity AS (
        SELECT "userId", "createdAt" FROM "UserEvent"
        UNION ALL
        SELECT "authorId", "createdAt" FROM "Post"
        UNION ALL
        SELECT "userId", "createdAt" FROM "Like"
      )
      SELECT
        date_trunc('day', "createdAt")::date AS day,
        COUNT(DISTINCT "userId")::bigint AS dau
      FROM activity
      WHERE "createdAt" >= now() - interval '30 days'
      GROUP BY day
      ORDER BY day ASC
    `,
    prisma.user.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
  ]);

  const stickiness = mau > 0 ? Math.round((dau / mau) * 100) : 0;
  const dauWauStickiness = wau > 0 ? Math.round((dau / wau) * 100) : 0;
  const wauMauStickiness = mau > 0 ? Math.round((wau / mau) * 100) : 0;

  const productLaunchDate = firstUser?.createdAt.toISOString().slice(0, 10) ?? now.toISOString().slice(0, 10);
  const launchDate = new Date(productLaunchDate);

  const seriesMap = new Map<string, number>();
  for (const row of dauSeriesRaw) {
    seriesMap.set(row.day.toISOString().slice(0, 10), Number(row.dau));
  }

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const fullSeries: number[] = [];
  const fullDates: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(startOfToday.getTime() - i * DAY_MS);
    const key = d.toISOString().slice(0, 10);
    fullSeries.push(seriesMap.get(key) ?? 0);
    fullDates.push(key);
  }

  // Trim leading pre-launch zeros
  let startIdx = fullSeries.findIndex((v) => v > 0);
  if (startIdx < 0) startIdx = 0;
  const dauSeries = fullSeries.slice(startIdx);
  const dauSeriesStartDate = fullDates[startIdx] ?? fullDates[0];

  const dau7dAvg = fullSeries.length >= 7
    ? Math.round(fullSeries.slice(-7).reduce((a, b) => a + b, 0) / 7)
    : Math.round(fullSeries.reduce((a, b) => a + b, 0) / Math.max(1, fullSeries.length));

  const dauDeltaAbs = dau - previousDau;

  // null when comparison period predates product launch — no valid baseline
  const mauDelta: number | null = previous30d < launchDate
    ? null
    : previousMau > 0 ? Math.round(((mau - previousMau) / previousMau) * 100) : 0;

  return {
    dau, wau, mau,
    stickiness, dauWauStickiness, wauMauStickiness,
    dauSeries, dauSeriesStartDate,
    previousDau, previousMau,
    dauDeltaAbs, dau7dAvg, mauDelta,
    productLaunchDate,
  };
}

// ─── Seção 3 — Distribuição de atividade ──────────────────────────────────

export async function getActivityDistribution(periodStart: Date): Promise<DistributionResult> {
  type BucketRaw = { bucket: string; users: bigint };
  type StatsRaw = { median: number | null; p90: number | null };
  type PostCountRow = { posts: bigint };

  const start = Prisma.sql`${periodStart}::timestamp`;

  const [postsBucketsRaw, postsStatsRaw, communitiesBucketsRaw, communitiesStatsRaw, postCountsRaw] =
    await Promise.all([
      prisma.$queryRaw<BucketRaw[]>`
        WITH user_posts AS (
          SELECT u.id, COUNT(p.id)::int AS posts
          FROM "User" u
          LEFT JOIN "Post" p
            ON p."authorId" = u.id
           AND p."replyToId" IS NULL
           AND p."createdAt" >= ${start}
          WHERE u."lastActiveAt" >= ${start}
          GROUP BY u.id
        )
        SELECT
          CASE
            WHEN posts = 0 THEN '0'
            WHEN posts BETWEEN 1 AND 5 THEN '1-5'
            WHEN posts BETWEEN 6 AND 20 THEN '6-20'
            WHEN posts BETWEEN 21 AND 50 THEN '21-50'
            WHEN posts BETWEEN 51 AND 100 THEN '51-100'
            ELSE '100+'
          END AS bucket,
          COUNT(*)::bigint AS users
        FROM user_posts
        GROUP BY 1
      `,
      prisma.$queryRaw<StatsRaw[]>`
        WITH user_posts AS (
          SELECT u.id, COUNT(p.id)::int AS posts
          FROM "User" u
          LEFT JOIN "Post" p
            ON p."authorId" = u.id
           AND p."replyToId" IS NULL
           AND p."createdAt" >= ${start}
          WHERE u."lastActiveAt" >= ${start}
          GROUP BY u.id
        )
        SELECT
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY posts)::float AS median,
          PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY posts)::float AS p90
        FROM user_posts
      `,
      prisma.$queryRaw<BucketRaw[]>`
        WITH user_comms AS (
          SELECT u.id, COUNT(cm."communityId")::int AS comms
          FROM "User" u
          LEFT JOIN "CommunityMember" cm ON cm."userId" = u.id
          WHERE u."lastActiveAt" >= ${start}
          GROUP BY u.id
        )
        SELECT
          CASE
            WHEN comms = 0 THEN '0'
            WHEN comms BETWEEN 1 AND 3 THEN '1-3'
            WHEN comms BETWEEN 4 AND 8 THEN '4-8'
            WHEN comms BETWEEN 9 AND 15 THEN '9-15'
            ELSE '16+'
          END AS bucket,
          COUNT(*)::bigint AS users
        FROM user_comms
        GROUP BY 1
      `,
      prisma.$queryRaw<StatsRaw[]>`
        WITH user_comms AS (
          SELECT u.id, COUNT(cm."communityId")::int AS comms
          FROM "User" u
          LEFT JOIN "CommunityMember" cm ON cm."userId" = u.id
          WHERE u."lastActiveAt" >= ${start}
          GROUP BY u.id
        )
        SELECT
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY comms)::float AS median,
          NULL::float AS p90
        FROM user_comms
      `,
      prisma.$queryRaw<PostCountRow[]>`
        SELECT COUNT(p.id)::bigint AS posts
        FROM "User" u
        LEFT JOIN "Post" p
          ON p."authorId" = u.id
         AND p."replyToId" IS NULL
         AND p."createdAt" >= ${start}
        WHERE u."lastActiveAt" >= ${start}
        GROUP BY u.id
        HAVING COUNT(p.id) > 0
        ORDER BY posts DESC
      `,
    ]);

  const bucketOrder = ["0", "1-5", "6-20", "21-50", "51-100", "100+"];
  const commsOrder = ["0", "1-3", "4-8", "9-15", "16+"];

  const sortBuckets = (rows: BucketRaw[], order: string[]): BucketRow[] =>
    order
      .map((bucket) => {
        const found = rows.find((r) => r.bucket === bucket);
        return { bucket, users: found ? Number(found.users) : 0 };
      });

  const postsBuckets = sortBuckets(postsBucketsRaw, bucketOrder);
  const communitiesBuckets = sortBuckets(communitiesBucketsRaw, commsOrder);

  const postCounts = postCountsRaw.map((r) => Number(r.posts));
  const totalPosts = postCounts.reduce((sum, n) => sum + n, 0);
  const totalActiveUsers = postsBuckets.reduce((sum, b) => sum + b.users, 0);

  let concentrationUsersPct = 0;
  let concentrationPostsPct = 0;
  if (totalPosts > 0 && totalActiveUsers > 0) {
    const target = totalPosts * 0.5;
    let accumulated = 0;
    let usersNeeded = 0;
    for (const count of postCounts) {
      accumulated += count;
      usersNeeded++;
      if (accumulated >= target) break;
    }
    concentrationUsersPct = Math.round((usersNeeded / totalActiveUsers) * 100);
    concentrationPostsPct = 50;
  }

  return {
    postsBuckets,
    postsMedian: Math.round(postsStatsRaw[0]?.median ?? 0),
    postsP90: Math.round(postsStatsRaw[0]?.p90 ?? 0),
    communitiesBuckets,
    communitiesMedian: Math.round(communitiesStatsRaw[0]?.median ?? 0),
    concentrationUsersPct,
    concentrationPostsPct,
    totalActiveUsers,
  };
}

// ─── Seção 4 — Saúde das comunidades ──────────────────────────────────────

export type CommunityHealthResult = {
  sizeBuckets: BucketRow[];
  totalCommunities: number;
  active7d: number;
  silent14d: number;
  silent30d: number;
  topByActivity: Array<{
    name: string;
    slug: string;
    members: number;
    posts: number;
    postsPerMember: number;
  }>;
};

export async function getCommunityHealth(periodStart: Date): Promise<CommunityHealthResult> {
  type BucketRaw = { bucket: string; communities: bigint };
  type TopRaw = { name: string; slug: string; members: bigint; posts: bigint };

  const start = Prisma.sql`${periodStart}::timestamp`;
  const now = new Date();
  const last7d = new Date(now.getTime() - 7 * DAY_MS);
  const last14d = new Date(now.getTime() - 14 * DAY_MS);
  const last30d = new Date(now.getTime() - 30 * DAY_MS);

  const [sizeBucketsRaw, totalCommunities, active7d, silent14d, silent30d, topByActivityRaw] =
    await Promise.all([
      prisma.$queryRaw<BucketRaw[]>`
        WITH community_sizes AS (
          SELECT c.id, COUNT(cm."userId")::int AS member_count
          FROM "Community" c
          LEFT JOIN "CommunityMember" cm ON cm."communityId" = c.id
          GROUP BY c.id
        )
        SELECT
          CASE
            WHEN member_count <= 1 THEN '1'
            WHEN member_count BETWEEN 2 AND 5 THEN '2-5'
            WHEN member_count BETWEEN 6 AND 15 THEN '6-15'
            WHEN member_count BETWEEN 16 AND 30 THEN '16-30'
            ELSE '31+'
          END AS bucket,
          COUNT(*)::bigint AS communities
        FROM community_sizes
        GROUP BY 1
      `,
      prisma.community.count(),
      prisma.community.count({
        where: { posts: { some: { replyToId: null, createdAt: { gte: last7d } } } },
      }),
      prisma.community.count({
        where: {
          createdAt: { lt: last14d },
          posts: { none: { replyToId: null, createdAt: { gte: last14d } } },
        },
      }),
      prisma.community.count({
        where: {
          createdAt: { lt: last30d },
          posts: { none: { replyToId: null, createdAt: { gte: last30d } } },
        },
      }),
      prisma.$queryRaw<TopRaw[]>`
        SELECT
          c.name,
          c.slug,
          (SELECT COUNT(*)::bigint FROM "CommunityMember" cm WHERE cm."communityId" = c.id) AS members,
          COUNT(p.id) FILTER (WHERE p."replyToId" IS NULL AND p."createdAt" >= ${start})::bigint AS posts
        FROM "Community" c
        LEFT JOIN "Post" p ON p."communityId" = c.id
        GROUP BY c.id, c.name, c.slug
        HAVING COUNT(p.id) FILTER (WHERE p."replyToId" IS NULL AND p."createdAt" >= ${start}) > 0
        ORDER BY posts DESC
        LIMIT 5
      `,
    ]);

  const sizeOrder = ["1", "2-5", "6-15", "16-30", "31+"];
  const sizeBuckets: BucketRow[] = sizeOrder.map((bucket) => {
    const found = sizeBucketsRaw.find((r) => r.bucket === bucket);
    return { bucket, users: found ? Number(found.communities) : 0 };
  });

  const topByActivity = topByActivityRaw.map((r) => {
    const members = Number(r.members);
    const posts = Number(r.posts);
    return {
      name: r.name,
      slug: r.slug,
      members,
      posts,
      postsPerMember: members > 0 ? Math.round((posts / members) * 100) / 100 : 0,
    };
  });

  return {
    sizeBuckets,
    totalCommunities,
    active7d,
    silent14d,
    silent30d,
    topByActivity,
  };
}

// ─── Seção 5 — Densidade do grafo social ──────────────────────────────────

export type GraphDensityResult = {
  weeklySeries: Array<{
    weekEnd: string;
    friendships: number;
    activeUsers: number;
    avgFriendships: number;
  }>;
  trend: "up" | "down" | "flat";
  weeklyDelta: number;
  isInDecline: boolean;
  totalActive30d: number;
  usersWithNoFriends: number;
  usersWithNoDeposPct: number;
  usersWithNoFriendsPct: number;
  usersWithNoDepos: number;
};

export async function getGraphDensity(): Promise<GraphDensityResult> {
  type WeeklyRow = {
    week_end: Date;
    friendships: bigint;
    active_users: bigint;
  };

  const now = new Date();
  const last30d = new Date(now.getTime() - 30 * DAY_MS);

  const [weeklyRaw, totalActive30d, usersWithNoFriends, usersWithNoDepos] = await Promise.all([
    prisma.$queryRaw<WeeklyRow[]>`
      WITH weeks AS (
        SELECT
          n AS week_offset,
          (now() - (n || ' weeks')::interval) AS week_end,
          (now() - ((n + 1) || ' weeks')::interval) AS week_start
        FROM generate_series(0, 7) AS n
      ),
      activity AS (
        SELECT "userId" AS user_id, "createdAt" FROM "UserEvent"
        UNION ALL
        SELECT "authorId", "createdAt" FROM "Post"
        UNION ALL
        SELECT "userId", "createdAt" FROM "Like"
      ),
      active_per_week AS (
        SELECT
          w.week_offset,
          COUNT(DISTINCT a.user_id)::bigint AS active_users
        FROM weeks w
        LEFT JOIN activity a
          ON a."createdAt" >= w.week_start AND a."createdAt" < w.week_end
        GROUP BY w.week_offset
      ),
      friendship_per_week AS (
        SELECT
          w.week_offset,
          (SELECT COUNT(*)::bigint FROM "Friendship" f WHERE f.status = 'ACCEPTED' AND f."createdAt" <= w.week_end) AS friendships
        FROM weeks w
      )
      SELECT
        w.week_end,
        fpw.friendships,
        apw.active_users
      FROM weeks w
      JOIN active_per_week apw ON apw.week_offset = w.week_offset
      JOIN friendship_per_week fpw ON fpw.week_offset = w.week_offset
      ORDER BY w.week_offset DESC
    `,
    prisma.user.count({ where: { lastActiveAt: { gte: last30d } } }),
    prisma.user.count({
      where: {
        lastActiveAt: { gte: last30d },
        sentFriendships: { none: { status: "ACCEPTED" } },
        receivedFriendships: { none: { status: "ACCEPTED" } },
      },
    }),
    prisma.user.count({
      where: {
        lastActiveAt: { gte: last30d },
        receivedDepos: { none: { status: "APPROVED" } },
      },
    }),
  ]);

  const weeklySeries = weeklyRaw.map((r) => {
    const friendships = Number(r.friendships);
    const activeUsers = Number(r.active_users);
    return {
      weekEnd: r.week_end.toISOString().slice(0, 10),
      friendships,
      activeUsers,
      avgFriendships:
        activeUsers > 0 ? Math.round(((friendships * 2) / activeUsers) * 100) / 100 : 0,
    };
  });

  // Ordena explicitamente do mais antigo ao mais recente.
  // Antes usava .reverse() assumindo a ordem do SQL, o que invertia a série:
  // o "valor atual" (at(-1)) acabava pegando a semana mais antiga (sem amizades ainda).
  const sortedByDate = [...weeklySeries].sort((a, b) => a.weekEnd.localeCompare(b.weekEnd));
  const last = sortedByDate.at(-1);
  const prev = sortedByDate.at(-2);
  const prevPrev = sortedByDate.at(-3);

  let trend: "up" | "down" | "flat" = "flat";
  let weeklyDelta = 0;
  if (last && prev) {
    if (prev.avgFriendships > 0) {
      weeklyDelta = Math.round(
        ((last.avgFriendships - prev.avgFriendships) / prev.avgFriendships) * 100
      );
    }
    if (last.avgFriendships > prev.avgFriendships) trend = "up";
    else if (last.avgFriendships < prev.avgFriendships) trend = "down";
  }

  const isInDecline =
    !!last &&
    !!prev &&
    !!prevPrev &&
    last.avgFriendships < prev.avgFriendships &&
    prev.avgFriendships < prevPrev.avgFriendships;

  return {
    weeklySeries: sortedByDate,
    trend,
    weeklyDelta,
    isInDecline,
    totalActive30d,
    usersWithNoFriends,
    usersWithNoFriendsPct:
      totalActive30d > 0 ? Math.round((usersWithNoFriends / totalActive30d) * 100) : 0,
    usersWithNoDepos,
    usersWithNoDeposPct:
      totalActive30d > 0 ? Math.round((usersWithNoDepos / totalActive30d) * 100) : 0,
  };
}

// ─── Seção 6 — Funil de ativação ──────────────────────────────────────────

export type FunnelStep = {
  label: string;
  count: number;
  pct: number;
  medianHours: number | null;
};

export type ActivationFunnelResult = {
  steps: FunnelStep[];
  biggestDropIndex: number;
  totalSignups: number;
};

export async function getActivationFunnel(): Promise<ActivationFunnelResult> {
  type Row = {
    total_signups: bigint;
    profile_completed: bigint;
    first_post: bigint;
    first_friend: bigint;
    first_community: bigint;
    d1_returned: bigint;
    d7_returned: bigint;
    first_post_seconds: number | null;
    first_friend_seconds: number | null;
    first_community_seconds: number | null;
  };

  const rows = await prisma.$queryRaw<Row[]>`
    WITH new_users AS (
      SELECT
        u.id,
        u."createdAt" AS signup_at,
        u."profileImageUrl",
        u.bio
      FROM "User" u
      WHERE u."createdAt" >= now() - interval '30 days' AND u."isActive" = true
    ),
    activity AS (
      SELECT "userId" AS user_id, "createdAt" FROM "UserEvent"
      UNION ALL
      SELECT "authorId", "createdAt" FROM "Post"
      UNION ALL
      SELECT "userId", "createdAt" FROM "Like"
    ),
    milestones AS (
      SELECT
        nu.id,
        nu.signup_at,
        (CASE WHEN nu."profileImageUrl" IS NOT NULL AND nu.bio IS NOT NULL THEN 1 ELSE 0 END) AS profile_completed,
        (SELECT MIN(p."createdAt") FROM "Post" p WHERE p."authorId" = nu.id AND p."replyToId" IS NULL) AS first_post_at,
        (SELECT MIN(f."createdAt") FROM "Friendship" f WHERE f.status = 'ACCEPTED' AND (f."requesterId" = nu.id OR f."receiverId" = nu.id)) AS first_friend_at,
        (SELECT MIN(cm."joinedAt") FROM "CommunityMember" cm WHERE cm."userId" = nu.id AND cm.role <> 'OWNER') AS first_community_at,
        EXISTS (
          SELECT 1 FROM activity a
          WHERE a.user_id = nu.id
            AND a."createdAt" >= nu.signup_at + interval '1 day'
            AND a."createdAt" < nu.signup_at + interval '2 days'
        ) AS d1_returned,
        EXISTS (
          SELECT 1 FROM activity a
          WHERE a.user_id = nu.id
            AND a."createdAt" >= nu.signup_at + interval '6 days'
            AND a."createdAt" < nu.signup_at + interval '8 days'
        ) AS d7_returned
      FROM new_users nu
    )
    SELECT
      COUNT(*)::bigint AS total_signups,
      COUNT(*) FILTER (WHERE profile_completed = 1)::bigint AS profile_completed,
      COUNT(*) FILTER (WHERE first_post_at IS NOT NULL)::bigint AS first_post,
      COUNT(*) FILTER (WHERE first_friend_at IS NOT NULL)::bigint AS first_friend,
      COUNT(*) FILTER (WHERE first_community_at IS NOT NULL)::bigint AS first_community,
      COUNT(*) FILTER (WHERE d1_returned)::bigint AS d1_returned,
      COUNT(*) FILTER (WHERE d7_returned)::bigint AS d7_returned,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (first_post_at - signup_at))) FILTER (WHERE first_post_at IS NOT NULL) AS first_post_seconds,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (first_friend_at - signup_at))) FILTER (WHERE first_friend_at IS NOT NULL) AS first_friend_seconds,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (first_community_at - signup_at))) FILTER (WHERE first_community_at IS NOT NULL) AS first_community_seconds
    FROM milestones
  `;

  const row = rows[0];
  const total = Number(row?.total_signups ?? 0);

  const secondsToHours = (seconds: number | null) =>
    seconds === null ? null : Math.round((seconds / 3600) * 10) / 10;

  const counts = [
    total,
    Number(row?.profile_completed ?? 0),
    Number(row?.first_post ?? 0),
    Number(row?.first_friend ?? 0),
    Number(row?.first_community ?? 0),
    Number(row?.d1_returned ?? 0),
    Number(row?.d7_returned ?? 0),
  ];

  const steps: FunnelStep[] = [
    { label: "cadastrou", count: counts[0], pct: 100, medianHours: 0 },
    { label: "completou perfil", count: counts[1], pct: pct(counts[1], total), medianHours: null },
    { label: "primeiro post", count: counts[2], pct: pct(counts[2], total), medianHours: secondsToHours(row?.first_post_seconds ?? null) },
    { label: "primeira amizade", count: counts[3], pct: pct(counts[3], total), medianHours: secondsToHours(row?.first_friend_seconds ?? null) },
    { label: "primeira comunidade", count: counts[4], pct: pct(counts[4], total), medianHours: secondsToHours(row?.first_community_seconds ?? null) },
    { label: "voltou em D1", count: counts[5], pct: pct(counts[5], total), medianHours: 24 },
    { label: "ainda ativo em D7", count: counts[6], pct: pct(counts[6], total), medianHours: 168 },
  ];

  let biggestDropIndex = 0;
  let biggestDrop = 0;
  for (let i = 1; i < steps.length; i++) {
    const drop = steps[i - 1].pct - steps[i].pct;
    if (drop > biggestDrop) {
      biggestDrop = drop;
      biggestDropIndex = i;
    }
  }

  return { steps, biggestDropIndex, totalSignups: total };
}

function pct(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

// ─── Seção 7 — Top padrinhos (qualidade) ──────────────────────────────────

export type GodparentRow = {
  username: string;
  brought: number;
  retained14d: number;
  retentionPct: number; // 0-100
  score: number;
};

export type TopGodparentsResult = {
  godparents: GodparentRow[];
  concentrationPct: number; // % dos cadastros por convite vindos dos 3 que mais trouxeram
  isConcentrated: boolean; // > 70%
  totalInvitedSignups: number;
};

export async function getTopGodparents(): Promise<TopGodparentsResult> {
  const cutoff14d = new Date(Date.now() - 14 * DAY_MS);

  // Quantos cada padrinho trouxe e, desses, quantos seguem ativos nos últimos 14d.
  const [broughtByGodparent, retainedByGodparent] = await Promise.all([
    prisma.user.groupBy({
      by: ["invitedById"],
      where: { invitedById: { not: null } },
      _count: { _all: true },
    }),
    prisma.user.groupBy({
      by: ["invitedById"],
      where: { invitedById: { not: null }, lastActiveAt: { gte: cutoff14d } },
      _count: { _all: true },
    }),
  ]);

  const retainedMap = new Map<string, number>();
  for (const r of retainedByGodparent) {
    if (r.invitedById) retainedMap.set(r.invitedById, r._count._all);
  }

  const totalInvitedSignups = broughtByGodparent.reduce((sum, r) => sum + r._count._all, 0);

  const rows = broughtByGodparent
    .filter((r): r is typeof r & { invitedById: string } => r.invitedById !== null)
    .map((r) => {
      const brought = r._count._all;
      const retained14d = retainedMap.get(r.invitedById) ?? 0;
      const retention = brought > 0 ? retained14d / brought : 0;
      // Score combina volume e qualidade: quem traz pouco mas todos ficam vale
      // mais que quem traz muito e perde metade.
      const score = Math.round(retention * Math.log10(brought + 1) * 100);
      return { id: r.invitedById, brought, retained14d, retentionPct: Math.round(retention * 100), score };
    });

  // Concentração: % dos cadastros por convite que vieram dos 3 que mais trouxeram.
  const top3Brought = [...rows]
    .sort((a, b) => b.brought - a.brought)
    .slice(0, 3)
    .reduce((sum, r) => sum + r.brought, 0);
  const concentrationPct = totalInvitedSignups > 0
    ? Math.round((top3Brought / totalInvitedSignups) * 100)
    : 0;

  // Ranking exibido: top 10 por score (qualidade), não por volume.
  const topByScore = [...rows].sort((a, b) => b.score - a.score).slice(0, 10);

  const users = await prisma.user.findMany({
    where: { id: { in: topByScore.map((r) => r.id) } },
    select: { id: true, username: true },
  });
  const usernameMap = new Map(users.map((u) => [u.id, u.username]));

  const godparents: GodparentRow[] = topByScore.map((r) => ({
    username: usernameMap.get(r.id) ?? "—",
    brought: r.brought,
    retained14d: r.retained14d,
    retentionPct: r.retentionPct,
    score: r.score,
  }));

  return {
    godparents,
    concentrationPct,
    isConcentrated: concentrationPct > 70,
    totalInvitedSignups,
  };
}
