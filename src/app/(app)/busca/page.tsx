import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ q?: string }> };

export default async function BuscaPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { q = "" } = await searchParams;
  const rawTerm = q.trim();
  const isCommunitySearch = rawTerm.startsWith("#");
  const term = isCommunitySearch ? rawTerm.slice(1) : rawTerm;

  let users: { id: string; username: string; gender: string }[] = [];
  let communities: { id: string; name: string; slug: string; coverImageUrl: string; _count: { members: number } }[] = [];

  if (term.length >= 2) {
    if (isCommunitySearch) {
      communities = await prisma.community.findMany({
        where: {
          OR: [
            { name: { contains: term, mode: "insensitive" } },
            { slug: { contains: term, mode: "insensitive" } },
          ],
        },
        select: { id: true, name: true, slug: true, coverImageUrl: true, _count: { select: { members: true } } },
        take: 20,
      });
    } else {
      [users, communities] = await Promise.all([
        prisma.user.findMany({
          where: { isActive: true, username: { contains: term, mode: "insensitive" }, NOT: { id: session.sub } },
          select: { id: true, username: true, gender: true },
          take: 20,
        }),
        prisma.community.findMany({
          where: { name: { contains: term, mode: "insensitive" } },
          select: { id: true, name: true, slug: true, coverImageUrl: true, _count: { select: { members: true } } },
          take: 20,
        }),
      ]);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold" style={{ color: "var(--color-text)", fontFamily: "var(--font-display)" }}>
          busca
        </h2>
        {rawTerm && (
          <p className="text-sm mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            {isCommunitySearch
              ? `comunidades com "${term}"`
              : `resultados para "${rawTerm}"`}
          </p>
        )}
      </div>

      {!rawTerm && (
        <div className="card p-8 text-center" style={{ color: "var(--color-text-muted)" }}>
          <p className="text-sm">Use a busca no topo para encontrar pessoas ou comunidades.</p>
          <p className="text-xs mt-2">Use # para buscar comunidades: <strong>#nome</strong></p>
        </div>
      )}

      {rawTerm && term.length < 2 && (
        <div className="card p-8 text-center" style={{ color: "var(--color-text-muted)" }}>
          <p className="text-sm">Digite pelo menos 2 caracteres{isCommunitySearch ? " após o #" : ""}.</p>
        </div>
      )}

      {term.length >= 2 && (
        <>
          {/* Usuários — oculto quando busca é por # */}
          {!isCommunitySearch && (
          <section className="card p-5">
            <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--color-text-muted)" }}>
              pessoas ({users.length})
            </h3>
            {users.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>Nenhum usuário encontrado.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {users.map((u) => (
                  <Link
                    key={u.id}
                    href={`/perfil/${u.username}`}
                    className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{
                        background: u.gender === "M" ? "rgba(253,101,160,.22)" : "rgba(49,213,222,.18)",
                        color: u.gender === "M" ? "var(--color-tece-pink)" : "var(--color-tece-blue)",
                      }}
                    >
                      {u.username[0].toUpperCase()}
                    </div>
                    <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                      @{u.username}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>
          )}

          {/* Comunidades */}
          <section className="card p-5">
            <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--color-text-muted)" }}>
              comunidades ({communities.length})
            </h3>
            {communities.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>Nenhuma comunidade encontrada.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {communities.map((c) => (
                  <Link
                    key={c.id}
                    href={`/comunidades/${c.slug}`}
                    className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                  >
                    <div
                      className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0"
                      style={{ background: "var(--color-tece-100)" }}
                    >
                      <img src={c.coverImageUrl} alt={c.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>{c.name}</p>
                      <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{c._count.members} membros</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
