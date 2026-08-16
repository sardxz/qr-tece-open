import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AceitarTermosForm from "@/components/auth/AceitarTermosForm";

export default async function AceitarTermosPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { termsAcceptedAt: true },
  });

  if (!user) redirect("/login");
  if (user.termsAcceptedAt) redirect("/home");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className="absolute -right-32 -top-32 h-96 w-96 rounded-full opacity-20"
          style={{ background: "var(--color-tece-300)" }}
        />
        <div
          className="absolute -bottom-48 -left-24 h-[32rem] w-[32rem] rounded-full opacity-15"
          style={{ background: "var(--color-tece-400)" }}
        />
        <svg className="absolute inset-0 h-full w-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.5" fill="var(--color-tece-700)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/">
            <h1
              className="text-5xl font-bold tracking-tight"
              style={{ color: "var(--color-tece-600)", fontFamily: "var(--font-display)" }}
            >
              qr.tecê
            </h1>
          </Link>
          <p className="mt-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
            atualização de termos
          </p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <div className="h-px flex-1" style={{ background: "var(--color-tece-200)" }} />
            <span className="text-xs" style={{ color: "var(--color-tece-300)" }}>✦</span>
            <div className="h-px flex-1" style={{ background: "var(--color-tece-200)" }} />
          </div>
        </div>

        <div className="card p-6">
          <div className="mb-5 flex flex-col gap-2">
            <p className="m-0 text-sm font-bold" style={{ color: "var(--color-text)" }}>
              Antes de seguir, precisamos do seu novo aceite.
            </p>
            <p className="m-0 text-sm leading-6" style={{ color: "var(--color-text-muted)" }}>
              Isso garante que sua conta fique alinhada com a versão atual dos nossos Termos de Uso e da Política de Privacidade.
            </p>
          </div>

          <AceitarTermosForm />
        </div>

        <p className="mt-6 text-center text-xs" style={{ color: "var(--color-tece-300)" }}>
          seu acesso continua assim que o aceite for confirmado
        </p>
      </div>
    </main>
  );
}
