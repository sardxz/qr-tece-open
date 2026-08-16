import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import ResetActivityCounter from "@/components/ResetActivityCounter";

export const dynamic = "force-dynamic";

function isNew(date: Date, lastSeen: Date | null) {
  return lastSeen ? date > lastSeen : false;
}

export default async function AtividadePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { lastSeenMentionsAt: true },
  });

  const lastSeen = user?.lastSeenMentionsAt ?? null;

  const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const mentionRegex = new RegExp(`@${escapeRegex(session.username)}(?![a-zA-Z0-9_])`, "i");

  const [mencoesCandidates, comments, depos, friendRequests, likes] = await Promise.all([
    prisma.post.findMany({
      where: {
        authorId: { not: session.sub },
        content: { contains: `@${session.username}`, mode: "insensitive" },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        author: { select: { username: true } },
        community: { select: { name: true, slug: true } },
      },
    }),
    prisma.post.findMany({
      where: {
        replyToId: { not: null },
        replyTo: { authorId: session.sub },
        authorId: { not: session.sub },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        author: { select: { username: true } },
        replyTo: { select: { id: true, content: true } },
      },
    }),
    prisma.depo.findMany({
      where: { recipientId: session.sub, status: { in: ["PENDING", "APPROVED"] } },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { author: { select: { username: true } } },
    }),
    prisma.friendship.findMany({
      where: { receiverId: session.sub, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: { requester: { select: { username: true } } },
    }),
    prisma.like.findMany({
      where: {
        post: { authorId: session.sub },
        userId: { not: session.sub },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        user: { select: { username: true } },
        post: { select: { id: true, content: true } },
      },
    }),
  ]);

  type ActivityItem =
    | { type: "mention"; date: Date; id: string; data: (typeof mencoes)[0] }
    | { type: "comment"; date: Date; id: string; data: (typeof comments)[number] }
    | { type: "depo"; date: Date; id: string; data: (typeof depos)[0] }
    | { type: "friendRequest"; date: Date; id: string; data: (typeof friendRequests)[0] }
    | { type: "like"; date: Date; id: string; data: (typeof likes)[0] };

  const commentIds = new Set(comments.map((c) => c.id));
  const mencoes = mencoesCandidates.filter(
    (p) => mentionRegex.test(p.content) && !commentIds.has(p.id)
  );

  const allActivities: ActivityItem[] = [
    ...mencoes.map((d) => ({ type: "mention" as const, date: d.createdAt, id: `mention-${d.id}`, data: d })),
    ...comments.map((d) => ({ type: "comment" as const, date: d.createdAt, id: `comment-${d.id}`, data: d })),
    ...depos.map((d) => ({ type: "depo" as const, date: d.createdAt, id: `depo-${d.id}`, data: d })),
    ...friendRequests.map((d) => ({ type: "friendRequest" as const, date: d.createdAt, id: `fr-${d.id}`, data: d })),
    ...likes.map((d) => ({ type: "like" as const, date: d.createdAt, id: `like-${d.userId}-${d.postId}`, data: d })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const totalNew = allActivities.filter((item) => isNew(item.date, lastSeen)).length;

  return (
    <div className="flex flex-col gap-6">
      <ResetActivityCounter />

      <div>
        <h2 className="text-xl font-bold" style={{ color: "var(--color-text)", fontFamily: "var(--font-display)" }}>
          atividade
        </h2>
        <p className="text-sm mt-0.5" style={{ color: "var(--color-text-muted)" }}>
          {totalNew > 0 ? `${totalNew} nova${totalNew !== 1 ? "s" : ""} desde a última visita` : "tudo em dia por aqui"}
        </p>
      </div>

      {allActivities.length === 0 ? (
        <div className="card p-6 text-center">
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            Nenhuma atividade ainda.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="divide-y" style={{ borderColor: "var(--color-border)" }}>
            {allActivities.map((item) => {
              const nova = isNew(item.date, lastSeen);
              const rowStyle = nova ? { background: "rgba(244,114,182,.06)" } : {};

              if (item.type === "friendRequest") {
                const fr = item.data;
                return (
                  <div key={item.id} className="p-4 flex items-center justify-between gap-3 flex-wrap" style={rowStyle}>
                    <div className="flex items-center gap-2">
                      {nova && <NewBadge />}
                      <Link href={`/perfil/${fr.requester.username}`} className="text-sm font-bold hover:underline" style={{ color: "var(--color-text)" }}>
                        @{fr.requester.username}
                      </Link>
                      <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>quer ser seu amigo</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DateLabel date={item.date} />
                      <Link href="/amigos" className="text-xs font-bold" style={{ color: "var(--color-tece-500)" }}>
                        ver →
                      </Link>
                    </div>
                  </div>
                );
              }

              if (item.type === "depo") {
                const depo = item.data;
                return (
                  <div key={item.id} className="p-4 flex flex-col gap-1" style={rowStyle}>
                    <div className="flex items-center gap-2 flex-wrap justify-between">
                      <div className="flex items-center gap-2">
                        {nova && <NewBadge />}
                        <Link href={`/perfil/${depo.author.username}`} className="text-sm font-bold hover:underline" style={{ color: "var(--color-text)" }}>
                          @{depo.author.username}
                        </Link>
                        <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>te deixou um depo</span>
                        {depo.status === "PENDING" && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(251,191,36,.2)", color: "#d97706" }}>
                            pendente
                          </span>
                        )}
                      </div>
                      <DateLabel date={item.date} />
                    </div>
                    <p className="text-sm leading-relaxed line-clamp-2" style={{ color: "var(--color-text)" }}>
                      {depo.content}
                    </p>
                    <Link href="/depos/recebidos" className="text-xs font-semibold self-start" style={{ color: "var(--color-tece-500)" }}>
                      ver depos →
                    </Link>
                  </div>
                );
              }

              if (item.type === "comment") {
                const reply = item.data;
                return (
                  <div key={item.id} className="p-4 flex flex-col gap-1" style={rowStyle}>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        {nova && <NewBadge />}
                        <Link href={`/perfil/${reply.author.username}`} className="text-sm font-bold hover:underline" style={{ color: "var(--color-text)" }}>
                          @{reply.author.username}
                        </Link>
                        <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>comentou no seu post</span>
                      </div>
                      <DateLabel date={item.date} />
                    </div>
                    <p className="text-xs italic line-clamp-1" style={{ color: "var(--color-text-muted)" }}>
                      seu post: {reply.replyTo!.content}
                    </p>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--color-text)" }}>
                      {reply.content}
                    </p>
                    <Link href={`/post/${reply.replyTo!.id}`} className="text-xs font-semibold self-start" style={{ color: "var(--color-tece-500)" }}>
                      ver post →
                    </Link>
                  </div>
                );
              }

              if (item.type === "mention") {
                const post = item.data;
                return (
                  <div key={item.id} className="p-4 flex flex-col gap-2" style={rowStyle}>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        {nova && <NewBadge />}
                        <Link href={`/perfil/${post.author.username}`} className="text-sm font-bold hover:underline" style={{ color: "var(--color-text)" }}>
                          @{post.author.username}
                        </Link>
                        {post.community ? (
                          <>
                            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>te mencionou em</span>
                            <Link href={`/comunidades/${post.community.slug}`} className="text-xs font-semibold hover:underline" style={{ color: "var(--color-tece-600)" }}>
                              {post.community.name}
                            </Link>
                          </>
                        ) : (
                          <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>te mencionou no feed</span>
                        )}
                      </div>
                      <DateLabel date={item.date} />
                    </div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--color-text)" }}>
                      <HighlightMention content={post.content} username={session.username} />
                    </p>
                    <Link href={`/post/${post.id}`} className="text-xs font-semibold self-start" style={{ color: "var(--color-tece-500)" }}>
                      ver post →
                    </Link>
                  </div>
                );
              }

              if (item.type === "like") {
                const like = item.data;
                return (
                  <div key={item.id} className="p-4 flex flex-col gap-1" style={rowStyle}>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        {nova && <NewBadge />}
                        <Link href={`/perfil/${like.user.username}`} className="text-sm font-bold hover:underline" style={{ color: "var(--color-text)" }}>
                          @{like.user.username}
                        </Link>
                        <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>curtiu seu post</span>
                      </div>
                      <DateLabel date={item.date} />
                    </div>
                    <p className="text-xs italic line-clamp-1" style={{ color: "var(--color-text-muted)" }}>
                      &ldquo;{like.post.content}&rdquo;
                    </p>
                    <Link href={`/post/${like.post.id}`} className="text-xs font-semibold self-start" style={{ color: "var(--color-tece-500)" }}>
                      ver post →
                    </Link>
                  </div>
                );
              }

              return null;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function NewBadge() {
  return (
    <span
      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
      style={{ background: "rgba(244,114,182,.2)", color: "var(--color-tece-pink)" }}
    >
      nova
    </span>
  );
}

function DateLabel({ date }: { date: Date }) {
  return (
    <span className="text-xs flex-shrink-0" style={{ color: "var(--color-text-muted)" }}>
      {new Date(date).toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })}
    </span>
  );
}

function HighlightMention({ content, username }: { content: string; username: string }) {
  const escaped = username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(@${escaped}(?![a-zA-Z0-9_]))`, "gi");
  const parts = content.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <strong key={i} style={{ color: "var(--color-tece-pink)" }}>
            {part}
          </strong>
        ) : (
          part
        )
      )}
    </>
  );
}
