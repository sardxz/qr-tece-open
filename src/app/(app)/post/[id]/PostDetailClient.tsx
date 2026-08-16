"use client";

import { useEffect, useState } from "react";
import NewPostForm from "@/components/feed/NewPostForm";
import PostCard from "@/components/feed/PostCard";
import type { PostCounts, PostWithAuthor, ReplyWithAuthor } from "@/types";

type Props = {
  postId: string;
  currentUserId?: string;
  currentUsername?: string;
  authorId: string;
  isAdmin?: boolean;
};

async function readJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      data && typeof data === "object" && "error" in data && typeof data.error === "string"
        ? data.error
        : `Erro ${res.status}`;
    throw new Error(message);
  }

  return data as T;
}

export default function PostDetailClient({
  postId,
  currentUserId,
  currentUsername,
  authorId,
  isAdmin,
}: Props) {
  const [post, setPost] = useState<PostWithAuthor | null>(null);
  const [replies, setReplies] = useState<ReplyWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [repliesLoading, setRepliesLoading] = useState(true);
  const [error, setError] = useState("");
  const [repliesError, setRepliesError] = useState("");
  const [refreshingReplies, setRefreshingReplies] = useState(false);

  async function loadPost() {
    const data = await readJson<PostWithAuthor>(`/api/posts/${postId}`);
    setPost(data);
    setError("");
  }

  async function loadReplies(options?: { silent?: boolean }) {
    if (!options?.silent) setRefreshingReplies(true);

    try {
      const data = await readJson<{ replies: ReplyWithAuthor[] }>(`/api/posts/${postId}/replies`);
      setReplies(data.replies);
      setRepliesError("");
    } catch (err) {
      setRepliesError(err instanceof Error ? err.message : "Erro ao carregar respostas.");
    } finally {
      setRepliesLoading(false);
      if (!options?.silent) setRefreshingReplies(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadPage() {
      setLoading(true);
      setRepliesLoading(true);

      try {
        const [postData, repliesData] = await Promise.all([
          readJson<PostWithAuthor>(`/api/posts/${postId}`),
          readJson<{ replies: ReplyWithAuthor[] }>(`/api/posts/${postId}/replies`),
        ]);

        if (cancelled) return;

        setPost(postData);
        setReplies(repliesData.replies);
        setError("");
        setRepliesError("");
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Erro ao carregar post.");
      } finally {
        if (cancelled) return;
        setLoading(false);
        setRepliesLoading(false);
      }
    }

    void loadPage();

    return () => {
      cancelled = true;
    };
  }, [postId]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const counts = await readJson<PostCounts>(`/api/posts/counts?ids=${postId}`);
        const next = counts[postId];
        if (!next) return;

        setPost((prev) => (
          prev
            ? {
                ...prev,
                _count: next,
              }
            : prev
        ));
      } catch {
        // silently ignore polling errors
      }
    }, 15_000);

    return () => clearInterval(interval);
  }, [postId]);

  if (loading) {
    return (
      <div className="card p-6 text-sm font-semibold" style={{ color: "var(--color-text-muted)" }}>
        carregando post...
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="card p-6">
        <h1 className="m-0 text-2xl font-black" style={{ color: "var(--color-text)" }}>
          post
        </h1>
        <p className="mt-3 text-sm font-semibold" style={{ color: "#b91c1c" }}>
          {error || "Post não encontrado."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="m-0 text-[32px] font-black leading-tight" style={{ color: "var(--color-text)" }}>
          post
        </h1>
        <p className="mt-1 text-[17px] font-bold" style={{ color: "var(--color-text-muted)" }}>
          acompanhe a conversa e responda direto aqui
        </p>
      </div>

      <PostCard
        post={post}
        currentUserId={currentUserId}
        isMentioned={
          !!currentUsername &&
          post.content.toLowerCase().includes(`@${currentUsername.toLowerCase()}`)
        }
      />

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="m-0 text-xl font-black" style={{ color: "var(--color-text)" }}>
              respostas
            </h2>
            <p className="mt-1 text-sm font-semibold" style={{ color: "var(--color-text-muted)" }}>
              {replies.length} {replies.length === 1 ? "resposta" : "respostas"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadReplies()}
            disabled={refreshingReplies}
            className="btn-secondary"
          >
            {refreshingReplies ? "atualizando..." : "ver novas respostas"}
          </button>
        </div>

        {repliesError && (
          <p className="text-sm font-semibold" style={{ color: "#b91c1c" }}>
            {repliesError}
          </p>
        )}

        {repliesLoading ? (
          <div className="card p-6 text-sm font-semibold" style={{ color: "var(--color-text-muted)" }}>
            carregando respostas...
          </div>
        ) : replies.length === 0 ? (
          <div className="card p-6 text-sm font-semibold" style={{ color: "var(--color-text-muted)" }}>
            nenhuma resposta ainda. seja o primeiro a responder.
          </div>
        ) : (
          <div className="card overflow-hidden divide-y" style={{ borderColor: "var(--color-border)" }}>
            {replies.map((reply) => (
              <PostCard
                key={reply.id}
                bare
                hideReplyButton
                post={reply}
                currentUserId={currentUserId}
                isMentioned={
                  !!currentUsername &&
                  reply.content.toLowerCase().includes(`@${currentUsername.toLowerCase()}`)
                }
              />
            ))}
          </div>
        )}
      </section>

      {currentUserId ? (
        <NewPostForm
          authorId={authorId}
          username={currentUsername}
          isAdmin={isAdmin}
          replyTo={{ id: post.id, username: post.author.username, content: post.content }}
          allowReplyDismiss={false}
          onSuccess={() => {
            void loadReplies();
            void loadPost();
          }}
        />
      ) : (
        <div className="card p-5 text-sm font-semibold" style={{ color: "var(--color-text-muted)" }}>
          faça login para responder este post.
        </div>
      )}
    </div>
  );
}
