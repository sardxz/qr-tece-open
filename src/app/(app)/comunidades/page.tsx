import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ComunidadesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const memberships = await prisma.communityMember.findMany({
    where: { userId: session.sub },
    orderBy: { joinedAt: "desc" },
    include: {
      community: {
        include: {
          createdBy: { select: { username: true } },
          _count: { select: { members: true, posts: true } },
        },
      },
    },
  });

  const myCommunities = memberships.map((m) => m.community);

  const allCommunities = await prisma.community.findMany({
    where: { id: { notIn: myCommunities.map((c) => c.id) } },
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { username: true } },
      _count: { select: { members: true, posts: true } },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h2
            className="text-xl font-bold"
            style={{ color: "var(--color-text)", fontFamily: "var(--font-display)" }}
          >
            minhas comunidades
          </h2>
          <p className="text-sm mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            {myCommunities.length === 0 ? "você ainda não entrou em nenhuma" : `${myCommunities.length} comunidade${myCommunities.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Link href="/comunidades/criar" className="btn-primary text-sm">
          + criar
        </Link>
      </div>

      {myCommunities.length === 0 ? (
        <div className="card p-8 text-center" style={{ color: "var(--color-text-muted)" }}>
          <p className="text-2xl mb-2">⬡</p>
          <p className="text-sm">Você ainda não faz parte de nenhuma comunidade.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {myCommunities.map((community) => (
            <Link
              key={community.id}
              href={`/comunidades/${community.slug}`}
              className="card p-4 flex items-start gap-3 transition-all hover:shadow-md block"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                style={{ background: "var(--color-tece-100)" }}
              >
                ⬡
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                    {community.name}
                  </h3>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: "var(--color-tece-100)", color: "var(--color-tece-700)" }}
                  >
                    membro
                  </span>
                </div>
                {community.description && (
                  <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "var(--color-text-muted)" }}>
                    {community.description}
                  </p>
                )}
                <p className="text-xs mt-1.5" style={{ color: "var(--color-tece-400)" }}>
                  {community._count.members} membros · {community._count.posts} posts
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {allCommunities.length > 0 && (
        <>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex-1 h-px" style={{ background: "var(--color-border)" }} />
            <span className="text-xs font-black uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
              descobrir
            </span>
            <div className="flex-1 h-px" style={{ background: "var(--color-border)" }} />
          </div>

          <div className="flex flex-col gap-3">
            {allCommunities.map((community) => (
              <Link
                key={community.id}
                href={`/comunidades/${community.slug}`}
                className="card p-4 flex items-start gap-3 transition-all hover:shadow-md block"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ background: "var(--color-tece-50)" }}
                >
                  ⬡
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                    {community.name}
                  </h3>
                  {community.description && (
                    <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "var(--color-text-muted)" }}>
                      {community.description}
                    </p>
                  )}
                  <p className="text-xs mt-1.5" style={{ color: "var(--color-tece-400)" }}>
                    {community._count.members} membros · {community._count.posts} posts
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
