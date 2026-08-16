"use client";

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import PostCard from "@/components/feed/PostCard";
import NewPostForm from "@/components/feed/NewPostForm";
import type { PostWithAuthor } from "@/types";

type Props = {
  initialPosts: PostWithAuthor[];
  currentUserId?: string;
  currentUsername?: string;
  authorId: string;
  communityId: string;
  isMember: boolean;
  isAdmin?: boolean;
};

export default function CommunityFeed({
  initialPosts,
  currentUserId,
  currentUsername,
  authorId,
  communityId,
  isMember,
  isAdmin,
}: Props) {
  const [posts, setPosts] = useState<PostWithAuthor[]>(() => [...initialPosts].reverse());
  const [replyingTo, setReplyingTo] = useState<PostWithAuthor | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const postRefs = useRef<Map<string, HTMLElement>>(new Map());
  const atBottomRef = useRef(true);
  const formRef = useRef<HTMLDivElement>(null);

  function handleReply(post: PostWithAuthor) {
    setReplyingTo(post);
    setTimeout(() => {
      const textarea = formRef.current?.querySelector("textarea");
      textarea?.focus();
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 0);
  }

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch(`/api/posts?communityId=${communityId}`);
      if (!res.ok) return;
      const data = await res.json();
      const fetched: PostWithAuthor[] = (data.posts as PostWithAuthor[]).reverse();
      setPosts((prev) => {
        if (fetched.length === prev.length && fetched[fetched.length - 1]?.id === prev[prev.length - 1]?.id) {
          return prev;
        }
        return fetched;
      });
    } catch {
      // silently ignore
    }
  }, [communityId]);

  useLayoutEffect(() => {
    scrollToBottom();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    if (atBottomRef.current) scrollToBottom();
  }, [posts, scrollToBottom]);

  function scrollToPost(postId: string) {
    const el = postRefs.current.get(postId);
    const container = scrollRef.current;
    if (!el || !container) return;
    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const offset = elRect.top - containerRect.top + container.scrollTop - 8;
    container.scrollTo({ top: offset, behavior: "smooth" });
  }

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    atBottomRef.current = el.scrollTop + el.clientHeight >= el.scrollHeight - 60;
  }

  useEffect(() => {
    const id = setInterval(fetchPosts, 5000);
    return () => clearInterval(id);
  }, [fetchPosts]);

  return (
    <>
      <div className="card overflow-hidden">
        {posts.length === 0 ? (
          <p className="p-6 text-sm text-center" style={{ color: "var(--color-text-muted)" }}>
            Nenhum post ainda. {isMember ? "Seja o primeiro!" : ""}
          </p>
        ) : (
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="divide-y overflow-y-auto"
            style={{ borderColor: "var(--color-border)", maxHeight: "480px" }}
          >
            {posts.map((post) => {
              const isMentioned =
                !!currentUsername &&
                post.content.toLowerCase().includes(`@${currentUsername.toLowerCase()}`);
              return (
                <div
                  key={post.id}
                  ref={(el) => {
                    if (el) postRefs.current.set(post.id, el);
                    else postRefs.current.delete(post.id);
                  }}
                >
                  <PostCard
                    bare
                    post={post}
                    currentUserId={currentUserId}
                    isMentioned={isMentioned}
                    onDelete={(id) => setPosts((prev) => prev.filter((item) => item.id !== id))}
                    onScrollToPost={scrollToPost}
                    onReply={isMember ? handleReply : undefined}
                  />
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {currentUserId && isMember && (
        <div ref={formRef}>
          <NewPostForm
            authorId={authorId}
            communityId={communityId}
            username={currentUsername}
            isAdmin={isAdmin}
            replyTo={replyingTo ? { id: replyingTo.id, username: replyingTo.author.username, content: replyingTo.content } : undefined}
            onSuccess={() => { setReplyingTo(null); void fetchPosts(); }}
          />
        </div>
      )}
    </>
  );
}
