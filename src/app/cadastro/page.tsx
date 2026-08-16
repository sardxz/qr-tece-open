import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import CadastroForm from "@/components/auth/CadastroForm";

type Props = {
  searchParams: Promise<{ convite?: string }>;
};

export default async function CadastroPage({ searchParams }: Props) {
  const session = await getSession();
  if (session) redirect("/home");

  const { convite } = await searchParams;

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
              tecê
            </h1>
          </Link>
          <p className="mt-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
            criar conta
          </p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <div className="h-px flex-1" style={{ background: "var(--color-tece-200)" }} />
            <span className="text-xs" style={{ color: "var(--color-tece-300)" }}>✦</span>
            <div className="h-px flex-1" style={{ background: "var(--color-tece-200)" }} />
          </div>
        </div>

        <div className="card p-6">
          <p className="mb-5 text-sm" style={{ color: "var(--color-text-muted)" }}>
            Você precisa de um convite para entrar.
          </p>
          <CadastroForm initialInviteCode={convite ?? ""} />
          <p className="mt-4 text-center text-xs" style={{ color: "var(--color-text-muted)" }}>
            Já tem conta?{" "}
            <Link href="/login" className="font-medium underline underline-offset-2" style={{ color: "var(--color-tece-600)" }}>
              Entrar
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs" style={{ color: "var(--color-tece-300)" }}>
          acesso apenas por convite
        </p>
      </div>
    </main>
  );
}
