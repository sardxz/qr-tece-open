"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type CommunityItem = {
  id: string;
  name: string;
  slug: string;
  memberCount: number;
};

type CommunitiesResponse = {
  communities: CommunityItem[];
  total: number;
  page: number;
  totalPages: number;
};

type Props = {
  username: string;
};

export default function ProfileCommunitiesList({ username }: Props) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<CommunitiesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadCommunities() {
      setIsLoading(true);
      setError("");

      try {
        const res = await fetch(`/api/profile/${username}/communities?page=${page}&limit=24`, {
          signal: controller.signal,
        });
        const nextData = (await res.json().catch(() => null)) as CommunitiesResponse | { error?: string } | null;

        if (!res.ok || !nextData || !("communities" in nextData)) {
          setError(
            nextData && typeof nextData === "object" && "error" in nextData && typeof nextData.error === "string"
              ? nextData.error
              : "Não foi possível carregar as comunidades.",
          );
          return;
        }

        setData(nextData);
      } catch (err) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          setError("Não foi possível carregar as comunidades.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadCommunities();

    return () => controller.abort();
  }, [page, username]);

  const communities = data?.communities ?? [];
  const totalPages = data?.totalPages ?? 0;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--color-text)", fontFamily: "var(--font-display)" }}>
          comunidades de @{username}
        </h1>
        <p className="mt-0.5 text-sm" style={{ color: "var(--color-text-muted)" }}>
          comunidades das quais este perfil participa
        </p>
      </div>

      <section className="card min-w-0 p-5">
        {isLoading ? (
          <div
            className="rounded-xl border px-4 py-6 text-center text-sm"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)", background: "rgba(7, 16, 34, 0.12)" }}
          >
            carregando comunidades...
          </div>
        ) : error ? (
          <div
            className="rounded-xl border px-4 py-6 text-center text-sm"
            style={{ borderColor: "rgba(239,68,68,.25)", color: "#b91c1c", background: "rgba(239,68,68,.08)" }}
          >
            {error}
          </div>
        ) : communities.length === 0 ? (
          <div
            className="rounded-xl border px-4 py-6 text-center text-sm"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)", background: "rgba(7, 16, 34, 0.12)" }}
          >
            este perfil ainda não participa de comunidades.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 min-[700px]:grid-cols-2">
            {communities.map((community) => (
              <Link
                key={community.id}
                href={`/comunidades/${community.slug}`}
                className="rounded-2xl border p-4 transition-opacity hover:opacity-85"
                style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
              >
                <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                  {community.name}
                </p>
                <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
                  /comunidades/{community.slug}
                </p>
                <p className="mt-2 text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                  {community.memberCount} membro{community.memberCount === 1 ? "" : "s"}
                </p>
              </Link>
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
    </div>
  );
}
