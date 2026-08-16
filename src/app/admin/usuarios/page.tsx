import { prisma } from "@/lib/prisma";
import ToggleUserButton from "@/components/admin/ToggleUserButton";
import DeleteUserButton from "@/components/admin/DeleteUserButton";

export const dynamic = "force-dynamic";

function formatLastActive(date: Date | null): string {
  if (!date) return "nunca";
  const diff = Date.now() - date.getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 2) return "agora";
  if (min < 60) return `${min} min atrás`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d atrás`;
  return date.toLocaleDateString("pt-BR");
}

function formatDeletedAt(date: Date): string {
  return `excluído em ${date.toLocaleDateString("pt-BR")}`;
}

export default async function AdminUsuariosPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      isActive: true,
      deletedAt: true,
      createdAt: true,
      lastActiveAt: true,
      _count: { select: { posts: true } },
    },
  });

  const activeCount = users.filter((u) => !u.deletedAt).length;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--color-text)", fontFamily: "var(--font-display)" }}>
          usuários
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--color-text-muted)" }}>
          {activeCount} contas cadastradas · {users.filter((u) => u.deletedAt).length} excluídas
        </p>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "var(--color-tece-50)", borderBottom: "1px solid var(--color-border)" }}>
              {["usuário", "e-mail", "posts", "role", "status", "últ. acesso", ""].map((h, i) => (
                <th key={i} className="text-left px-4 py-2.5 text-xs font-semibold"
                  style={{ color: "var(--color-text-muted)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => {
              const isDeleted = !!u.deletedAt;
              const rowStyle: React.CSSProperties = {
                borderBottom: i < users.length - 1 ? "1px solid var(--color-border)" : "none",
                opacity: isDeleted ? 0.45 : 1,
              };

              if (isDeleted) {
                return (
                  <tr key={u.id} style={rowStyle}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-xs italic" style={{ color: "var(--color-text-muted)" }}>
                        [excluído]
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
                      [removido]
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-muted)" }}>—</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: "var(--color-border)", color: "var(--color-text-muted)" }}>
                        —
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: "var(--color-border)", color: "var(--color-text-muted)" }}>
                        excluído
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
                      {formatDeletedAt(u.deletedAt!)}
                    </td>
                    <td className="px-4 py-3" />
                  </tr>
                );
              }

              return (
                <tr key={u.id} style={rowStyle}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-xs" style={{ color: "var(--color-text)" }}>@{u.username}</p>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {u.email}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {u._count.posts}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: u.role === "ADMIN" ? "var(--color-tece-200)" : "var(--color-tece-50)",
                        color: u.role === "ADMIN" ? "var(--color-tece-800)" : "var(--color-text-muted)",
                      }}>
                      {u.role.toLowerCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: u.isActive ? "#dcfce7" : "#fee2e2",
                        color: u.isActive ? "#15803d" : "#b91c1c",
                      }}>
                      {u.isActive ? "ativo" : "inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {formatLastActive(u.lastActiveAt)}
                  </td>
                  <td className="px-4 py-3">
                    {u.role !== "ADMIN" && (
                      <div className="flex items-center gap-2">
                        <ToggleUserButton userId={u.id} isActive={u.isActive} />
                        <DeleteUserButton userId={u.id} username={u.username} />
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
