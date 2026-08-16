import { prisma } from "@/lib/prisma";
import UpdatesManager from "@/components/admin/UpdatesManager";

export const dynamic = "force-dynamic";

export default async function AdminAtualizacoesPage() {
  const updates = await prisma.siteUpdate.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { username: true } },
      _count: { select: { likes: true } },
    },
  });

  const serialized = updates.map((u) => ({
    id: u.id,
    content: u.content,
    type: u.type as "FEATURE" | "FIX" | "BUG",
    createdAt: u.createdAt.toISOString(),
    author: u.author,
    likeCount: u._count.likes,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>
          atualizações do tecê
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--color-text-muted)" }}>
          publique features, melhorias e bugs visíveis para todos os usuários
        </p>
      </div>

      <UpdatesManager initialUpdates={serialized} />
    </div>
  );
}
