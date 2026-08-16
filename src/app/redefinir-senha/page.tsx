import Link from "next/link";
import { redirect } from "next/navigation";
import RedefinirSenhaForm from "@/components/auth/RedefinirSenhaForm";

type Props = {
  searchParams: Promise<{ token?: string }>;
};

export default async function RedefinirSenhaPage({ searchParams }: Props) {
  const { token } = await searchParams;

  if (!token) redirect("/esqueci-senha");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div
        aria-hidden
        className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
      >
        <div
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20"
          style={{ background: "var(--color-tece-300)" }}
        />
        <div
          className="absolute -bottom-48 -right-24 w-[32rem] h-[32rem] rounded-full opacity-15"
          style={{ background: "var(--color-tece-400)" }}
        />
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.04]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="dots"
              x="0"
              y="0"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="2" cy="2" r="1.5" fill="var(--color-tece-700)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>
      </div>

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/">
            <h1
              className="text-5xl font-bold tracking-tight"
              style={{ color: "var(--color-tece-600)", fontFamily: "var(--font-display)" }}
            >
              qr.tecê
            </h1>
          </Link>
          <p className="mt-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
            redefinir senha
          </p>
          <div className="flex items-center gap-2 justify-center mt-3">
            <div className="h-px flex-1" style={{ background: "var(--color-tece-200)" }} />
            <span className="text-xs" style={{ color: "var(--color-tece-300)" }}>✦</span>
            <div className="h-px flex-1" style={{ background: "var(--color-tece-200)" }} />
          </div>
        </div>

        <div className="card p-6">
          <p className="text-sm mb-5" style={{ color: "var(--color-text-muted)" }}>
            Escolha uma nova senha para concluir a redefinição.
          </p>
          <RedefinirSenhaForm token={token} />
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "var(--color-tece-300)" }}>
          acesso apenas por convite
        </p>
      </div>
    </main>
  );
}
