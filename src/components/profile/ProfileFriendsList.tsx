"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatLongDate } from "@/lib/utils";

type FriendItem = {
  id: string;
  username: string;
  profileImageUrl: string | null;
  gender: string | null;
  friendsSince: string;
};

type FriendsResponse = {
  friends: FriendItem[];
  total: number;
  page: number;
  totalPages: number;
};

type Props = {
  username: string;
};

function FriendAvatar({ username, profileImageUrl, gender }: Omit<FriendItem, "id" | "friendsSince">) {
  if (profileImageUrl) {
    return (
      <img
        src={profileImageUrl}
        alt={username}
        className="h-14 w-14 rounded-full object-cover"
        style={{ border: `2px solid ${gender === "M" ? "var(--color-tece-pink)" : "var(--color-tece-cyan)"}` }}
      />
    );
  }

  return (
    <div
      className="grid h-14 w-14 shrink-0 place-items-center rounded-full text-base font-bold"
      style={{
        background: gender === "M" ? "rgba(253,101,160,.18)" : "rgba(49,213,222,.18)",
        color: gender === "M" ? "var(--color-tece-pink)" : "var(--color-tece-blue)",
      }}
    >
      {username[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

export default function ProfileFriendsList({ username }: Props) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<FriendsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadFriends() {
      setIsLoading(true);
      setError("");

      try {
        const res = await fetch(`/api/profile/${username}/friends?page=${page}&limit=24`, {
          signal: controller.signal,
        });
        const nextData = (await res.json().catch(() => null)) as FriendsResponse | { error?: string } | null;

        if (!res.ok || !nextData || !("friends" in nextData)) {
          setError(
            nextData && typeof nextData === "object" && "error" in nextData && typeof nextData.error === "string"
              ? nextData.error
              : "Não foi possível carregar os amigos.",
          );
          return;
        }

        setData(nextData);
      } catch (err) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          setError("Não foi possível carregar os amigos.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadFriends();

    return () => controller.abort();
  }, [page, username]);

  const friends = data?.friends ?? [];
  const totalPages = data?.totalPages ?? 0;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--color-text)", fontFamily: "var(--font-display)" }}>
          amigos de @{username}
        </h1>
        <p className="mt-0.5 text-sm" style={{ color: "var(--color-text-muted)" }}>
          conexões aprovadas exibidas no perfil
        </p>
      </div>

      <section className="card min-w-0 p-5">
        {isLoading ? (
          <div
            className="rounded-xl border px-4 py-6 text-center text-sm"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)", background: "rgba(7, 16, 34, 0.12)" }}
          >
            carregando amigos...
          </div>
        ) : error ? (
          <div
            className="rounded-xl border px-4 py-6 text-center text-sm"
            style={{ borderColor: "rgba(239,68,68,.25)", color: "#b91c1c", background: "rgba(239,68,68,.08)" }}
          >
            {error}
          </div>
        ) : friends.length === 0 ? (
          <div
            className="rounded-xl border px-4 py-6 text-center text-sm"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)", background: "rgba(7, 16, 34, 0.12)" }}
          >
            este perfil ainda não tem amigos listados.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 min-[700px]:grid-cols-2">
            {friends.map((friend) => (
              <Link
                key={friend.id}
                href={`/perfil/${friend.username}`}
                className="flex items-center gap-3 rounded-2xl border p-4 transition-opacity hover:opacity-85"
                style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
              >
                <FriendAvatar
                  username={friend.username}
                  profileImageUrl={friend.profileImageUrl}
                  gender={friend.gender}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                    @{friend.username}
                  </p>
                  <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
                    amigos desde {formatLongDate(friend.friendsSince)}
                  </p>
                </div>
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
