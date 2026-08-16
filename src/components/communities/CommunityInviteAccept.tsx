"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Community = {
  name: string;
  slug: string;
  coverImageUrl: string;
};

type Props = {
  token: string;
};

async function parseJson<T>(response: Response): Promise<T | null> {
  return (await response.json().catch(() => null)) as T | null;
}

export default function CommunityInviteAccept({ token }: Props) {
  const router = useRouter();
  const [community, setCommunity] = useState<Community | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "accepted">("idle");
  const [error, setError] = useState("");

  async function acceptInvite() {
    if (status === "loading") return;

    setStatus("loading");
    setError("");

    try {
      const response = await fetch(`/api/community-invites/${token}/accept`, {
        method: "POST",
      });
      const data = await parseJson<{ community?: Community; error?: string }>(response);

      if ((response.ok || response.status === 409) && data?.community) {
        setCommunity(data.community);
        setStatus("accepted");
        window.setTimeout(() => {
          router.push(`/comunidades/${data.community?.slug}`);
          router.refresh();
        }, 700);
        return;
      }

      if (response.status === 401) {
        setError("Entre na sua conta para aceitar este convite.");
        setStatus("idle");
        return;
      }

      setError(data?.error ?? "Nao foi possivel aceitar este convite.");
      setStatus("idle");
    } catch {
      setError("Erro de conexao. Tente novamente.");
      setStatus("idle");
    }
  }

  return (
    <div className="card w-full max-w-md overflow-hidden">
      {community?.coverImageUrl && (
        <div className="relative h-44 overflow-hidden">
          <Image
            src={community.coverImageUrl}
            alt={community.name}
            fill
            sizes="(max-width: 768px) 100vw, 448px"
            className="object-cover"
          />
        </div>
      )}

      <div className="flex flex-col gap-5 p-6">
        <div>
          <p className="m-0 text-xs font-black uppercase tracking-[0.08em]" style={{ color: "var(--color-text-muted)" }}>
            convite de comunidade
          </p>
          <h1 className="m-0 mt-2 text-2xl font-black leading-tight" style={{ color: "var(--color-text)", fontFamily: "var(--font-display)" }}>
            {community ? community.name : "Aceitar convite"}
          </h1>
          <p className="m-0 mt-2 text-sm leading-6" style={{ color: "var(--color-text-muted)" }}>
            Entre com este convite para participar da comunidade.
          </p>
        </div>

        {error && (
          <div
            className="rounded-xl border px-3 py-2 text-sm font-semibold"
            style={{ borderColor: "rgba(239, 68, 68, 0.24)", background: "rgba(239, 68, 68, 0.08)", color: "#b91c1c" }}
          >
            {error}
          </div>
        )}

        {status === "accepted" && community ? (
          <div className="flex flex-col gap-3">
            <p className="m-0 text-sm font-bold" style={{ color: "var(--color-text)" }}>
              Convite aceito. Abrindo a comunidade...
            </p>
            <Link href={`/comunidades/${community.slug}`} className="btn-primary text-center">
              Ir agora
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => void acceptInvite()}
              disabled={status === "loading"}
              className="btn-primary"
            >
              {status === "loading" ? "aceitando..." : "aceitar convite"}
            </button>
            <Link href="/" className="btn-secondary text-center">
              entrar na minha conta
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
