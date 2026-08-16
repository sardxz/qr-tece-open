import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DepoActions from "@/components/profile/DepoActions";

export const dynamic = "force-dynamic";

export default async function DeposRecebidosPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const pendentes = await prisma.depo.findMany({
    where: { recipientId: session.sub, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    include: { author: { select: { username: true } } },
  });

  const aprovados = await prisma.depo.findMany({
    where: { recipientId: session.sub, status: "APPROVED" },
    orderBy: { approvedAt: "desc" },
    include: { author: { select: { username: true } } },
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2
          className="text-xl font-bold"
          style={{ color: "var(--color-text)", fontFamily: "var(--font-display)" }}
        >
          depos recebidos
        </h2>
        <p className="text-sm mt-0.5" style={{ color: "var(--color-text-muted)" }}>
          aprovados aparecem no seu perfil
        </p>
      </div>

      {/* Pendentes */}
      {pendentes.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--color-text-muted)" }}>
            pendentes ({pendentes.length})
          </h3>
          <div className="flex flex-col gap-3">
            {pendentes.map((depo) => (
              <div
                key={depo.id}
                className="p-3 rounded-xl"
                style={{ background: "var(--color-tece-50)", border: "1px solid var(--color-tece-200)" }}
              >
                <p className="text-sm leading-relaxed" style={{ color: "var(--color-text)" }}>
                  {depo.content}
                </p>
                <p className="text-xs mt-1.5" style={{ color: "var(--color-text-muted)" }}>
                  — @{depo.author.username}
                </p>
                <DepoActions depoId={depo.id} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Aprovados */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--color-text-muted)" }}>
          aprovados ({aprovados.length})
        </h3>
        {aprovados.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            Nenhum depo aprovado ainda.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {aprovados.map((depo) => (
              <div
                key={depo.id}
                className="p-3 rounded-xl flex items-start justify-between gap-3"
                style={{ background: "var(--color-tece-50)", border: "1px solid var(--color-border)" }}
              >
                <div>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--color-text)" }}>
                    {depo.content}
                  </p>
                  <p className="text-xs mt-1.5" style={{ color: "var(--color-text-muted)" }}>
                    — @{depo.author.username}
                  </p>
                </div>
                <DepoActions depoId={depo.id} showApprove={false} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
