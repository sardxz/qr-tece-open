"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { linkifyPlain } from "@/lib/linkify";
type DepoItem = {
  id: string;
  content: string;
  approvedAt: string | null;
  author: {
    username: string;
    profileImageUrl: string | null;
    gender: string | null;
  };
};

type DeposResponse = {
  depos: DepoItem[];
  total: number;
  page: number;
  totalPages: number;
};

type Props = {
  username: string;
};

function DepoAuthorAvatar({ username, profileImageUrl, gender }: DepoItem["author"]) {
  if (profileImageUrl) {
    return (
      <img
        src={profileImageUrl}
        alt={username}
        className="h-12 w-12 rounded-full object-cover"
        style={{ border: `2px solid ${gender === "M" ? "var(--color-tece-pink)" : "var(--color-tece-cyan)"}` }}
      />
    );
  }

  return (
    <div
      className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-sm font-bold"
      style={{
        background: gender === "M" ? "rgba(253,101,160,.18)" : "rgba(49,213,222,.18)",
        color: gender === "M" ? "var(--color-tece-pink)" : "var(--color-tece-blue)",
      }}
    >
      {username[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

export default function ProfileDepos({ username }: Props) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<DeposResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadDepos() {
      setIsLoading(true);
      setError("");

      try {
        const res = await fetch(`/api/profile/${username}/depos?page=${page}&limit=10`, {
          signal: controller.signal,
        });
        const nextData = (await res.json().catch(() => null)) as DeposResponse | { error?: string } | null;

        if (!res.ok || !nextData || !("depos" in nextData)) {
          setError(
            nextData && typeof nextData === "object" && "error" in nextData && typeof nextData.error === "string"
              ? nextData.error
              : "Não foi possível carregar os depos.",
          );
          return;
        }

        setData(nextData);
      } catch (err) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          setError("Não foi possível carregar os depos.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadDepos();

    return () => controller.abort();
  }, [page, username]);

  const depos = data?.depos ?? [];
  const totalPages = data?.totalPages ?? 0;

  return (
    <section className="card min-w-0 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className="grid h-7 w-7 place-items-center rounded-md text-[14px]"
            style={{ background: "rgba(49,213,222,.12)", color: "var(--color-tece-500)" }}
          >
            ✎
          </span>
          <h2 className="text-sm font-semibold" style={{ color: "var(--color-text-muted)" }}>
            depos
          </h2>
        </div>
        {data && (
          <span className="text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>
            {data.total} total
          </span>
        )}
      </div>

      {isLoading ? (
        <div
          className="rounded-xl border px-4 py-6 text-center text-sm"
          style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)", background: "rgba(7, 16, 34, 0.12)" }}
        >
          carregando depos...
        </div>
      ) : error ? (
        <div
          className="rounded-xl border px-4 py-6 text-center text-sm"
          style={{ borderColor: "rgba(239,68,68,.25)", color: "#b91c1c", background: "rgba(239,68,68,.08)" }}
        >
          {error}
        </div>
      ) : depos.length === 0 ? (
        <div
          className="rounded-xl border px-4 py-6 text-center text-sm"
          style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)", background: "rgba(7, 16, 34, 0.12)" }}
        >
          nenhum depo aprovado ainda.
        </div>
      ) : (
        <div className="grid max-h-[320px] grid-cols-2 gap-3 overflow-y-auto pr-1">
          {depos.map((depo) => (
            <article
              key={depo.id}
              className="rounded-2xl border p-4"
              style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
            >
              <div className="flex items-start gap-3">
                <Link
                  href={`/perfil/${depo.author.username}`}
                  className="shrink-0 transition-opacity hover:opacity-85"
                  title={`ver perfil de @${depo.author.username}`}
                >
                  <DepoAuthorAvatar
                    username={depo.author.username}
                    profileImageUrl={depo.author.profileImageUrl}
                    gender={depo.author.gender}
                  />
                </Link>

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/perfil/${depo.author.username}`}
                    className="min-w-0 text-sm font-semibold transition-opacity hover:opacity-80"
                    style={{ color: "var(--color-text)" }}
                  >
                    @{depo.author.username}
                  </Link>
                  <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--color-text)" }}>
                    {linkifyPlain(depo.content)}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between gap-3 border-t pt-4" style={{ borderColor: "var(--color-border)" }}>
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page === 1 || isLoading}
            className="rounded-xl border px-3 py-2 text-sm font-medium transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ borderColor: "var(--color-border)", color: "var(--color-tece-500)" }}
          >
            anterior
          </button>
          <span className="text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>
            página {page} de {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={page === totalPages || isLoading}
            className="rounded-xl border px-3 py-2 text-sm font-medium transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ borderColor: "var(--color-border)", color: "var(--color-tece-500)" }}
          >
            próxima
          </button>
        </div>
      )}
    </section>
  );
}
