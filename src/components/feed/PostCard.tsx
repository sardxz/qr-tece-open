"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PostWithAuthor } from "@/types";
import { useTheme } from "@/components/ThemeProvider";
import { formatPostDate } from "@/lib/utils";
import { URL_REGEX, isUrl, UrlLink } from "@/lib/linkify";

type Props = {
  post: PostWithAuthor;
  currentUserId?: string;
  bare?: boolean;
  isMentioned?: boolean;
  onReply?: (post: PostWithAuthor) => void;
  onDelete?: (id: string) => void;
  onScrollToPost?: (postId: string) => void;
  hideReplyButton?: boolean;
};

function Avatar({
  username,
  profileImageUrl,
}: {
  username: string;
  profileImageUrl?: string | null;
}) {
  if (profileImageUrl) {
    return (
      <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
        <img src={profileImageUrl} alt={username} className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
      style={{ background: "var(--color-tece-200)", color: "var(--color-tece-700)" }}
    >
      {username[0].toUpperCase()}
    </div>
  );
}


export default function PostCard({
  post,
  currentUserId,
  bare,
  isMentioned,
  onReply,
  onDelete,
  onScrollToPost,
  hideReplyButton,
}: Props) {
  const router = useRouter();
  const { theme } = useTheme();
  const [toggling, setToggling] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [displayContent, setDisplayContent] = useState(post.content);
  const [wasEdited, setWasEdited] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editError, setEditError] = useState("");
  const [showOwnerMenu, setShowOwnerMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [likeState, setLikeState] = useState({
    liked: post.likedByMe ?? false,
    likeCount: post._count.likes,
  });
  const [repostState, setRepostState] = useState({
    reposted: post.repostedByMe ?? false,
    count: post._count.reposts ?? 0,
  });
  const [showRepostModal, setShowRepostModal] = useState(false);
  const [repostContent, setRepostContent] = useState("");
  const [reposting, setReposting] = useState(false);
  const [repostError, setRepostError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isOwner = post.author.id === currentUserId;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowOwnerMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSaveEdit() {
    if (!editContent.trim() || saving) return;
    setSaving(true);
    setEditError("");
    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error ?? "Erro ao salvar");
        return;
      }
      setDisplayContent(data.content);
      setEditContent(data.content);
      setWasEdited(true);
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  }

  function handleStartEdit() {
    setEditContent(displayContent);
    setEditError("");
    setShowOwnerMenu(false);
    setIsEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  function openDeleteConfirm() {
    setShowOwnerMenu(false);
    setShowDeleteConfirm(true);
  }

  function closeDeleteConfirm() {
    if (deleting) return;
    setShowDeleteConfirm(false);
  }

  async function handleDeletePost() {
    setDeleting(true);
    setEditError("");

    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        try {
          const data = await res.json();
          setEditError(data.error ?? "Erro ao excluir");
        } catch {
          const text = await res.text().catch(() => "");
          setEditError(text || "Erro ao excluir");
        }
        return;
      }

      setShowDeleteConfirm(false);
      onDelete?.(post.id);
      if (!onDelete) {
        router.refresh();
      }
    } catch {
      setEditError("Erro ao excluir");
    } finally {
      setDeleting(false);
    }
  }

  // O ID alvo para repost é sempre o original (caso este card já seja um repost)
  const repostTargetId = post.repostOf?.id ?? post.id;

  async function handleRepost() {
    if (!currentUserId) return;
    if (repostState.reposted) {
      // Desfaz repost
      setRepostState((s) => ({ reposted: false, count: s.count - 1 }));
      try {
        await fetch(`/api/posts/${repostTargetId}/repost`, { method: "DELETE" });
        router.refresh();
      } catch {
        setRepostState((s) => ({ reposted: true, count: s.count + 1 }));
      }
      return;
    }
    setShowRepostModal(true);
  }

  async function handleSubmitRepost() {
    if (!repostContent.trim() || reposting) return;
    setReposting(true);
    setRepostError("");
    try {
      const res = await fetch(`/api/posts/${repostTargetId}/repost`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: repostContent.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRepostError(data.error ?? "Erro ao repostar");
        return;
      }
      setRepostState((s) => ({ reposted: true, count: s.count + 1 }));
      setShowRepostModal(false);
      setRepostContent("");
      router.refresh();
    } catch {
      setRepostError("Erro ao repostar");
    } finally {
      setReposting(false);
    }
  }

  async function handleLike() {
    if (!currentUserId || toggling) return;
    setToggling(true);
    const optimistic = !likeState.liked;
    const nextState = {
      liked: optimistic,
      likeCount: likeState.likeCount + (optimistic ? 1 : -1),
    };
    setLikeState(nextState);

    try {
      const res = await fetch(`/api/posts/${post.id}/like`, {
        method: likeState.liked ? "DELETE" : "POST",
      });
      if (!res.ok) {
        setLikeState({
          liked: !optimistic,
          likeCount: nextState.likeCount + (optimistic ? -1 : 1),
        });
      } else {
        router.refresh();
      }
    } catch {
      setLikeState({
        liked: !optimistic,
        likeCount: nextState.likeCount + (optimistic ? -1 : 1),
      });
    } finally {
      setToggling(false);
    }
  }

  const mentionStyle = isMentioned
    ? theme === "dark"
      ? { borderLeft: "3px solid #ff1493", background: "rgba(255,20,147,0.12)" }
      : { borderLeft: "3px solid #9b72d4", background: "#f3eeff" }
    : {};

  function renderMentions(text: string, keyPrefix: string) {
    return text.split(/([@#][\w-]+)/g).map((part, index) => {
      if (part.startsWith("@")) {
        const username = part.slice(1);
        return (
          <Fragment key={`${keyPrefix}-${index}`}>
            <Link
              href={`/perfil/${username}`}
              className="font-bold hover:underline"
              style={{ color: "var(--color-tece-500)" }}
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </Link>
          </Fragment>
        );
      }

      if (part.startsWith("#")) {
        const slug = part.slice(1);
        return (
          <Fragment key={`${keyPrefix}-${index}`}>
            <Link
              href={`/comunidades/${slug}`}
              className="font-bold hover:underline"
              style={{ color: "var(--color-tece-600)" }}
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </Link>
          </Fragment>
        );
      }

      return <Fragment key={`${keyPrefix}-${index}`}>{part}</Fragment>;
    });
  }

  // Extrai URLs primeiro pra que o # de fragmentos nao seja tratado como hashtag.
  function renderContent(text: string) {
    return text.split(URL_REGEX).map((chunk, ci) =>
      chunk && isUrl(chunk) ? (
        <UrlLink key={`u-${ci}`} raw={chunk} />
      ) : (
        <Fragment key={`t-${ci}`}>{renderMentions(chunk, `t-${ci}`)}</Fragment>
      )
    );
  }

  return (
    <>
      {showRepostModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6"
          role="dialog"
          aria-modal="true"
          onClick={() => { if (!reposting) { setShowRepostModal(false); setRepostError(""); } }}
        >
          <div className="card w-full max-w-md p-6 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="m-0 text-lg font-black" style={{ color: "var(--color-text)" }}>
              Repostar com citação
            </h3>

            {/* Preview do post original */}
            <div
              className="rounded-xl border p-3 flex flex-col gap-2"
              style={{ borderColor: "var(--color-border)", background: "rgba(19,23,48,0.6)" }}
            >
              <span className="text-xs font-bold" style={{ color: "var(--color-text-muted)" }}>
                @{(post.repostOf ?? post).author.username}
              </span>
              <span className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--color-text-muted)" }}>
                {(post.repostOf ?? post).content}
              </span>
            </div>

            <textarea
              autoFocus
              value={repostContent}
              onChange={(e) => setRepostContent(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="adicione sua citação..."
              className="input-base text-sm resize-none"
            />
            {repostError && (
              <p className="text-xs m-0" style={{ color: "#e63946" }}>{repostError}</p>
            )}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => { setShowRepostModal(false); setRepostError(""); }}
                className="btn-secondary text-xs"
                disabled={reposting}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleSubmitRepost()}
                disabled={reposting || !repostContent.trim()}
                className="btn-primary text-xs"
              >
                {reposting ? "Repostando..." : "Repostar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <article
        className={bare ? "relative p-4 flex flex-col gap-3" : "relative card p-4 flex flex-col gap-3 cursor-pointer"}
        style={mentionStyle}
        onClick={!bare && !isEditing ? () => router.push(`/post/${post.id}`) : undefined}
      >
        {post.repostOf && (
          <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 014-4h14" />
              <path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 01-4 4H3" />
            </svg>
            <span>@{post.author.username} repostou</span>
          </div>
        )}
        {isOwner && !isEditing && (
          <div ref={menuRef} className="absolute right-3 top-3 z-10">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowOwnerMenu((prev) => !prev);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full border-0 bg-transparent p-0 opacity-60 transition-opacity hover:opacity-100"
            style={{ color: "var(--color-text-muted)" }}
            title="ações do post"
            aria-label="Ações do post"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="5" r="1.8" fill="currentColor" />
              <circle cx="12" cy="12" r="1.8" fill="currentColor" />
              <circle cx="12" cy="19" r="1.8" fill="currentColor" />
            </svg>
          </button>

          {showOwnerMenu && (
            <div
              className="absolute right-0 top-full mt-2 min-w-[132px] rounded-xl border py-1 shadow-lg"
              style={{
                background: "var(--color-card, var(--color-surface))",
                borderColor: "var(--color-border)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={handleStartEdit}
                className="block w-full border-0 bg-transparent px-4 py-2 text-left text-sm font-semibold hover:opacity-80"
                style={{ color: "var(--color-text)" }}
              >
                Editar
              </button>
              <button
                type="button"
                onClick={openDeleteConfirm}
                disabled={deleting}
                className="block w-full border-0 bg-transparent px-4 py-2 text-left text-sm font-semibold hover:opacity-80 disabled:opacity-50"
                style={{ color: "#dc2626" }}
              >
                Excluir
              </button>
            </div>
          )}
          </div>
        )}

      <div className="flex items-start gap-3">
        <Link href={`/perfil/${post.author.username}`} onClick={(e) => e.stopPropagation()}>
          <Avatar
            username={post.author.username}
            profileImageUrl={post.author.profileImageUrl}
          />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <Link
              href={`/perfil/${post.author.username}`}
              className="text-sm font-semibold hover:underline"
              style={{ color: "var(--color-text)" }}
              onClick={(e) => e.stopPropagation()}
            >
              @{post.author.username}
            </Link>
            {post.community && (
              <>
                <span className="text-xs" style={{ color: "var(--color-tece-300)" }}>
                  em
                </span>
                <Link
                  href={`/comunidades/${post.community.slug}`}
                  className="text-xs font-medium hover:underline"
                  style={{ color: "var(--color-tece-600)" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {post.community.name}
                </Link>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              {formatPostDate(post.createdAt)}
            </p>
            {wasEdited && (
              <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                (editado)
              </span>
            )}
            {false && isOwner && !isEditing && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartEdit();
                }}
                className="text-[10px] leading-none border-0 bg-transparent p-0 cursor-pointer opacity-50 hover:opacity-100 transition-opacity"
                style={{ color: "var(--color-text-muted)" }}
                title="editar post"
              >
                ✏️
              </button>
            )}
          </div>
        </div>
      </div>

      {post.repostOf && (
        <div
          className="rounded-xl border p-3 flex flex-col gap-2"
          style={{ borderColor: "var(--color-border)", background: "rgba(19,23,48,0.6)" }}
        >
          <div className="flex items-center gap-2">
            <Avatar username={post.repostOf.author.username} profileImageUrl={post.repostOf.author.profileImageUrl} />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-bold" style={{ color: "var(--color-text)" }}>
                @{post.repostOf.author.username}
              </span>
              {post.repostOf.community && (
                <span className="text-xs ml-1" style={{ color: "var(--color-text-muted)" }}>
                  em {post.repostOf.community.name}
                </span>
              )}
            </div>
          </div>
          <span className="text-sm leading-relaxed whitespace-pre-wrap block" style={{ color: "var(--color-text-muted)" }}>
            {post.repostOf.content}
          </span>
          {post.repostOf.imageUrl && (
            <img
              src={post.repostOf.imageUrl}
              alt="imagem do post original"
              className="max-w-full rounded-lg"
              style={{ maxHeight: "240px", objectFit: "contain" }}
            />
          )}
        </div>
      )}

      {post.replyTo && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            const replyTo = post.replyTo;
            if (!replyTo) return;
            if (onScrollToPost) {
              onScrollToPost(replyTo.id);
              return;
            }
            router.push(`/post/${replyTo.id}`);
          }}
          className="flex items-start gap-2 w-full rounded-lg px-3 py-2 text-left transition-colors hover:opacity-80"
          style={{
            background: "rgba(49,213,222,.08)",
            borderLeft: "3px solid var(--color-tece-300)",
          }}
        >
          <span className="text-xs mt-0.5 flex-shrink-0" style={{ color: "var(--color-tece-400)" }}>
            ↩
          </span>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-bold block" style={{ color: "var(--color-tece-600)" }}>
              @{post.replyTo.author.username}
            </span>
            <span className="text-xs block truncate" style={{ color: "var(--color-text-muted)" }}>
              {post.replyTo.content}
            </span>
          </div>
        </button>
      )}

      {isEditing ? (
        <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
          <textarea
            ref={textareaRef}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={4}
            className="input-base text-sm resize-none"
            maxLength={1000}
          />
          {editError && (
            <p className="text-xs" style={{ color: "#e63946" }}>
              {editError}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSaveEdit}
              disabled={saving || !editContent.trim()}
              className="btn-primary text-xs px-4 py-2"
              style={{ padding: "0.4rem 1rem", fontSize: "0.8rem" }}
            >
              {saving ? "salvando..." : "salvar"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setEditError("");
              }}
              className="btn-secondary text-xs"
              style={{ padding: "0.4rem 1rem", fontSize: "0.8rem" }}
            >
              cancelar
            </button>
          </div>
        </div>
      ) : (
        <>
          <span
            className="text-sm leading-relaxed whitespace-pre-wrap block"
            style={{ color: "var(--color-text)" }}
          >
            {renderContent(displayContent)}
          </span>
          {post.imageUrl && (
            <img
              src={post.imageUrl}
              alt="imagem do post"
              className="max-w-full rounded-lg"
              style={{ maxHeight: "400px", objectFit: "contain" }}
            />
          )}
        </>
      )}

      {!isEditing && editError && (
        <p className="text-xs" style={{ color: "#e63946" }}>
          {editError}
        </p>
      )}

        <div
          className="flex items-center gap-5 pt-1 border-t"
          style={{ borderColor: "var(--color-border)" }}
        >
        <button
          onClick={(e) => {
            e.stopPropagation();
            void handleLike();
          }}
          disabled={!currentUserId}
          className="flex items-center gap-1.5 text-xs transition-all active:scale-125"
          style={{
            color: likeState.liked ? "#e63946" : "var(--color-text-muted)",
            fontWeight: likeState.liked ? "700" : "400",
          }}
        >
          <span
            className="text-[1.55rem] leading-none"
            style={{ filter: likeState.liked ? "drop-shadow(0 0 4px #e6394688)" : "none" }}
          >
            {likeState.liked ? "♥" : "♡"}
          </span>
          <span>{likeState.likeCount > 0 ? likeState.likeCount : ""}</span>
        </button>

        {!hideReplyButton && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onReply) {
                onReply(post);
                return;
              }
              router.push(`/post/${post.id}`);
            }}
            className="flex items-center gap-1.5 text-xs transition-all active:scale-110"
            style={{ color: "var(--color-text-muted)" }}
          >
            <span className="text-[1.55rem] leading-none">💬</span>
            <span className="text-xs">{post._count.comments > 0 ? post._count.comments : ""}</span>
          </button>
        )}

        {currentUserId && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              void handleRepost();
            }}
            className="flex items-center gap-1.5 text-xs transition-all active:scale-110"
            style={{
              color: repostState.reposted ? "var(--color-tece-500)" : "var(--color-text-muted)",
              fontWeight: repostState.reposted ? "700" : "400",
            }}
            title={repostState.reposted ? "Desfazer repost" : "Repostar com citação"}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 1l4 4-4 4" />
              <path d="M3 11V9a4 4 0 014-4h14" />
              <path d="M7 23l-4-4 4-4" />
              <path d="M21 13v2a4 4 0 01-4 4H3" />
            </svg>
            <span>{repostState.count > 0 ? repostState.count : ""}</span>
          </button>
        )}
        </div>
      </article>

      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`delete-post-title-${post.id}`}
          onClick={closeDeleteConfirm}
        >
          <div
            className="card w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-3">
              <h3
                id={`delete-post-title-${post.id}`}
                className="m-0 text-xl font-black"
                style={{ color: "var(--color-text)" }}
              >
                Excluir post
              </h3>
              <p className="m-0 text-sm leading-6" style={{ color: "var(--color-text-muted)" }}>
                Essa ação não pode ser desfeita.
              </p>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDeleteConfirm}
                className="btn-secondary"
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleDeletePost()}
                disabled={deleting}
                className="rounded-[10px] px-4 py-2 text-sm font-black transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
                style={{ background: "#dc2626", color: "#fff", border: "none", cursor: "pointer" }}
              >
                {deleting ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
