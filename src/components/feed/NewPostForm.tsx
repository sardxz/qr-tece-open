"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { ReplyTarget } from "@/types";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

type Props = {
  authorId: string;
  communityId?: string;
  username?: string;
  isAdmin?: boolean;
  replyTo?: ReplyTarget;
  onReplyClose?: () => void;
  onSuccess?: () => void;
  allowReplyDismiss?: boolean;
};

export default function NewPostForm({
  communityId,
  username,
  replyTo,
  onReplyClose,
  onSuccess,
  allowReplyDismiss = true,
}: Props) {
  const router = useRouter();
  const replyMention = replyTo ? `@${replyTo.username} ` : "";
  const [content, setContent] = useState(replyMention);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [communityQuery, setCommunityQuery] = useState<string | null>(null);
  const [communitySuggestions, setCommunitySuggestions] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [hashStart, setHashStart] = useState<number>(-1);
  const emojiRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const MAX = 1000;

  useEffect(() => {
    if (replyTo) {
      setTimeout(() => {
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(replyMention.length, replyMention.length);
      }, 0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replyTo?.id]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmoji(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!communityQuery || communityQuery.length < 2) {
      return;
    }
    let cancelled = false;
    fetch(`/api/search?q=%23${encodeURIComponent(communityQuery)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setCommunitySuggestions(data.communities ?? []);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [communityQuery]);

  function handleContentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setContent(val);

    const cursor = e.target.selectionStart ?? val.length;
    const beforeCursor = val.slice(0, cursor);
    const hashMatch = beforeCursor.match(/#([\w-]*)$/);

    if (hashMatch && hashMatch[1].length >= 2) {
      setCommunityQuery(hashMatch[1]);
      setHashStart(cursor - hashMatch[0].length);
    } else {
      setCommunityQuery(null);
      setCommunitySuggestions([]);
      setHashStart(-1);
    }
  }

  function selectCommunity(community: { slug: string }) {
    if (hashStart < 0) return;
    const cursor = textareaRef.current?.selectionStart ?? content.length;
    const before = content.slice(0, hashStart);
    const after = content.slice(cursor);
    const inserted = `#${community.slug}`;
    const newContent = before + inserted + after;
    setContent(newContent);
    setCommunityQuery(null);
    setCommunitySuggestions([]);
    setHashStart(-1);
    setTimeout(() => {
      const pos = hashStart + inserted.length;
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(pos, pos);
    }, 0);
  }

  function onEmojiClick(emojiData: { emoji: string }) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newContent = content.slice(0, start) + emojiData.emoji + content.slice(end);
    setContent(newContent);
    setShowEmoji(false);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emojiData.emoji.length, start + emojiData.emoji.length);
    }, 0);
  }

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload/post-image", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429) {
          setError("Você já enviou 1 foto hoje. O limite é 1 foto por dia.");
          return;
        }
        setError(data.error ?? "Erro ao enviar imagem");
        return;
      }
      setImageUrl(data.url);
    } catch {
      setError("Erro ao enviar imagem.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() && !imageUrl) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), communityId, replyToId: replyTo?.id, imageUrl }),
      });

      if (!res.ok) {
        try {
          const data = await res.json();
          setError(data.error ?? `Erro ${res.status}`);
        } catch {
          const text = await res.text().catch(() => "");
          setError(`Erro ${res.status}: ${text.slice(0, 120)}`);
        }
        return;
      }

      setContent("");
      setImageUrl(null);
      setCommunityQuery(null);
      setCommunitySuggestions([]);
      setHashStart(-1);
      onReplyClose?.();
      if (onSuccess) {
        onSuccess();
      } else {
        router.refresh();
      }
    } catch {
      setError("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card mt-7">
      {replyTo && (
        <div
          className="flex items-center justify-between px-[26px] py-2 text-xs rounded-t-[18px]"
          style={{ background: "var(--color-tece-50)", borderBottom: "1px solid var(--color-border)", color: "var(--color-tece-600)" }}
        >
          <span>respondendo a <strong>@{replyTo.username}</strong></span>
          {allowReplyDismiss && (
            <button
              type="button"
              onClick={() => { setContent(""); onReplyClose?.(); }}
              className="font-bold"
              style={{ color: "var(--color-text-muted)" }}
            >
              ✕
            </button>
          )}
        </div>
      )}
      <div className="flex min-h-[115px] min-[901px]:min-h-[170px] items-start gap-[22px] p-[26px]">
        <div
          className="grid h-[52px] w-[52px] flex-shrink-0 place-items-center rounded-full text-xl font-black mt-1"
          style={{ background: "rgba(49,213,222,.18)", color: "var(--color-tece-blue)" }}
        >
          {(username ?? "?")[0].toUpperCase()}
        </div>
        <div className="flex-1 flex flex-col gap-2 relative">
          <textarea
            ref={textareaRef}
            className="min-h-[62px] min-[901px]:min-h-[120px] w-full resize-none border-0 bg-transparent text-[17px] font-black outline-none"
            style={{ color: "var(--color-text-muted)" }}
            placeholder="o que você está pensando?"
            rows={2}
            value={content}
            onChange={handleContentChange}
            maxLength={MAX}
          />
          {communitySuggestions.length > 0 && (
            <div
              className="absolute z-50 left-[96px] mt-1 w-64 rounded-xl border shadow-lg overflow-hidden"
              style={{ background: "var(--color-card, var(--color-surface))", borderColor: "var(--color-border)" }}
            >
              {communitySuggestions.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); selectCommunity(c); }}
                  className="w-full text-left px-4 py-2 text-sm font-bold hover:opacity-80 transition-opacity"
                  style={{ color: "var(--color-tece-600)" }}
                >
                  #{c.slug}
                  <span className="ml-2 text-xs font-normal" style={{ color: "var(--color-text-muted)" }}>
                    {c.name}
                  </span>
                </button>
              ))}
            </div>
          )}
          {imageUrl && (
            <div className="relative w-fit">
              <img src={imageUrl} alt="preview" className="max-h-[200px] rounded-lg object-cover" />
              <button
                type="button"
                onClick={() => setImageUrl(null)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold leading-none"
                style={{ background: "rgba(0,0,0,.55)", color: "#fff" }}
                title="remover imagem"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>

      <div
        className="relative flex items-center gap-[26px] border-t px-[26px] py-5 text-[26px]"
        style={{ borderColor: "var(--color-border)", color: "#445066" }}
      >
          <label
            aria-label="Anexar imagem"
            className={`cursor-pointer p-0 leading-none ${uploading ? "pointer-events-none opacity-50" : ""}`}
            title={uploading ? "enviando..." : "anexar imagem"}
          >
            🖼️
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={handleImageSelect}
            />
          </label>

        <button
          type="button"
          aria-label="Inserir emoji"
          onClick={() => setShowEmoji((v) => !v)}
          className="cursor-pointer border-0 bg-transparent p-0 leading-none"
        >
          ☺
        </button>

        {showEmoji && (
          <div
            ref={emojiRef}
            className="z-50 min-[901px]:absolute min-[901px]:bottom-full min-[901px]:left-0 min-[901px]:mb-2 max-[900px]:fixed max-[900px]:left-3 max-[900px]:right-3 max-[900px]:top-[12%]"
          >
            <EmojiPicker onEmojiClick={onEmojiClick} height={350} width={320} />
          </div>
        )}

        <span className="ml-auto text-[15px] font-bold" style={{ color: "var(--color-text-muted)" }}>
          {content.length}/{MAX}
        </span>
        <button type="submit" className="btn-primary" disabled={loading || (!content.trim() && !imageUrl)}>
          {loading ? "publicando..." : "publicar"}
        </button>
      </div>

      {error && (
        <p className="px-[26px] pb-4 text-sm font-bold" style={{ color: "#b91c1c" }}>
          {error}
        </p>
      )}
    </form>
  );
}
