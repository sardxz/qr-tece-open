"use client";

import { useEffect, useState } from "react";
import PostCard from "@/components/feed/PostCard";
import type { PostCounts, PostWithAuthor } from "@/types";

type Props = {
  initialPosts: PostWithAuthor[];
  currentUserId?: string;
  currentUsername?: string;
};

export default function HomeFeed({ initialPosts, currentUserId, currentUsername }: Props) {
  const [posts, setPosts] = useState<PostWithAuthor[]>(initialPosts);
  const postIdsKey = posts.map((post) => post.id).join(",");

  useEffect(() => {
    const interval = setInterval(async () => {
      if (!postIdsKey) return;

      try {
        const res = await fetch(`/api/posts/counts?ids=${postIdsKey}`);
        if (!res.ok) return;

        const counts: PostCounts = await res.json();
        setPosts((prev) => prev.map((post) => (
          counts[post.id]
            ? {
                ...post,
                _count: counts[post.id],
              }
            : post
        )));
      } catch {
        // silently ignore polling errors
      }
    }, 15_000);

    return () => clearInterval(interval);
  }, [postIdsKey]);

  if (posts.length === 0) {
    return (
      <div className="card grid min-h-[315px] place-items-center text-center" style={{ color: "var(--color-text-muted)" }}>
        <div>
          <div
            className="mx-auto mb-5 grid h-[135px] w-[135px] place-items-center rounded-full text-[52px]"
            style={{ background: "rgba(170,242,228,.35)" }}
          >
            💬
          </div>
          <h2 className="m-0 text-[22px] font-black" style={{ color: "var(--color-text)" }}>
            o feed está vazio por enquanto.
          </h2>
          <p className="mt-2 font-semibold">seja o primeiro a compartilhar algo.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {posts.map((post) => {
        const isMentioned =
          !!currentUsername &&
          post.content.toLowerCase().includes(`@${currentUsername.toLowerCase()}`);
        return (
          <PostCard
            key={post.id}
            post={post}
            currentUserId={currentUserId}
            isMentioned={isMentioned}
            onDelete={(id) => setPosts((prev) => prev.filter((item) => item.id !== id))}
          />
        );
      })}
    </div>
  );
}
