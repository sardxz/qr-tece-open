import Link from "next/link";
import { getSession } from "@/lib/auth";
import CommunityInviteAccept from "@/components/communities/CommunityInviteAccept";

type Props = {
  params: Promise<{ token: string }>;
};

export default async function CommunityInvitePage({ params }: Props) {
  const { token } = await params;
  const session = await getSession();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className="absolute -left-32 -top-32 h-96 w-96 rounded-full opacity-20"
          style={{ background: "var(--color-tece-300)" }}
        />
        <div
          className="absolute -bottom-48 -right-24 h-[32rem] w-[32rem] rounded-full opacity-15"
          style={{ background: "var(--color-tece-400)" }}
        />
      </div>

      <div className="mb-8 text-center">
        <Link href={session ? "/home" : "/"}>
          <h1
            className="text-5xl font-bold tracking-tight"
            style={{ color: "var(--color-tece-600)", fontFamily: "var(--font-display)" }}
          >
            qr.tece
          </h1>
        </Link>
      </div>

      {session ? (
        <CommunityInviteAccept token={token} />
      ) : (
        <div className="card w-full max-w-md p-6">
          <p className="m-0 text-xs font-black uppercase tracking-[0.08em]" style={{ color: "var(--color-text-muted)" }}>
            convite de comunidade
          </p>
          <h1 className="m-0 mt-2 text-2xl font-black leading-tight" style={{ color: "var(--color-text)", fontFamily: "var(--font-display)" }}>
            Entre para aceitar
          </h1>
          <p className="m-0 mt-2 text-sm leading-6" style={{ color: "var(--color-text-muted)" }}>
            Voce precisa estar logado para entrar por este convite.
          </p>
          <div className="mt-5 flex flex-col gap-3">
            <Link href="/" className="btn-primary text-center">
              entrar na minha conta
            </Link>
            <Link href="/cadastro" className="btn-secondary text-center">
              criar conta com convite
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
