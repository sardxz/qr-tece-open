import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import GenerateInviteButton from "@/components/admin/GenerateInviteButton";

export const dynamic = "force-dynamic";

export default async function AdminConvitesPage() {
  const session = await getSession();

  const invites = await prisma.invite.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { username: true } },
      usedBy: { select: { username: true } },
    },
    take: 50,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--color-text)", fontFamily: "var(--font-display)" }}>
            convites
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            gerencie o acesso à plataforma
          </p>
        </div>
        <GenerateInviteButton adminId={session!.sub} />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "var(--color-tece-50)", borderBottom: "1px solid var(--color-border)" }}>
              {["código", "criado por", "status", "usado por", "data"].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold"
                  style={{ color: "var(--color-text-muted)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invites.map((inv, i) => (
              <tr
                key={inv.id}
                style={{
                  borderBottom: i < invites.length - 1 ? "1px solid var(--color-border)" : "none",
                }}
              >
                <td className="px-4 py-3">
                  <code
                    className="text-xs font-mono px-2 py-0.5 rounded"
                    style={{ background: "var(--color-tece-50)", color: "var(--color-tece-700)" }}
                  >
                    {inv.code}
                  </code>
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
                  @{inv.createdBy.username}
                </td>
                <td className="px-4 py-3">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      background: inv.usedById ? "var(--color-tece-100)" : "#fef9c3",
                      color: inv.usedById ? "var(--color-tece-700)" : "#854d0e",
                    }}
                  >
                    {inv.usedById ? "usado" : "disponível"}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {inv.usedBy ? `@${inv.usedBy.username}` : "—"}
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {new Date(inv.createdAt).toLocaleDateString("pt-BR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
