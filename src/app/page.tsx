import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import LoginForm from "@/components/auth/LoginForm";

export default async function HomePage() {
  const session = await getSession();
  if (session) redirect("/home");

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
          <h1
            className="text-5xl font-bold tracking-tight"
            style={{ color: "var(--color-tece-600)", fontFamily: "var(--font-display)" }}
          >
            qr.tecê
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
            conexões, sem ego
          </p>
          <div className="flex items-center gap-2 justify-center mt-3">
            <div className="h-px flex-1" style={{ background: "var(--color-tece-200)" }} />
            <span className="text-xs" style={{ color: "var(--color-tece-300)" }}>✦</span>
            <div className="h-px flex-1" style={{ background: "var(--color-tece-200)" }} />
          </div>
        </div>

        <div className="card p-6">
          <p className="text-sm mb-5" style={{ color: "var(--color-text-muted)" }}>
            Entre na sua conta
          </p>
          <LoginForm />
          <p className="mt-4 text-xs text-center" style={{ color: "var(--color-text-muted)" }}>
            Ainda não tem conta?{" "}
            <Link
              href="/cadastro"
              className="font-medium underline underline-offset-2"
              style={{ color: "var(--color-tece-600)" }}
            >
              Entrar com convite
            </Link>
          </p>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "var(--color-tece-300)" }}>
          acesso apenas por convite
        </p>
      </div>
    </main>
  );
}
