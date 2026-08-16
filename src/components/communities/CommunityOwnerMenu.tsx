"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  slug: string;
  initialName: string;
  initialDescription: string | null;
  initialRules: string | null;
  /** Quando false (ex.: admin que não criou a comunidade), mostra apenas "Excluir". */
  canManage?: boolean;
  canInvite?: boolean;
};

export default function CommunityOwnerMenu({
  slug,
  initialName,
  initialDescription,
  initialRules,
  canManage = true,
  canInvite = true,
}: Props) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [rules, setRules] = useState(initialRules ?? "");
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [loadingInvite, setLoadingInvite] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const trimmedName = name.trim();
  const canSave = trimmedName.length >= 3 && trimmedName.length <= 80;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setShowMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function openEditModal() {
    setName(initialName);
    setDescription(initialDescription ?? "");
    setRules(initialRules ?? "");
    setError("");
    setShowMenu(false);
    setShowEditModal(true);
  }

  function closeEditModal() {
    if (saving) return;
    setShowEditModal(false);
    setError("");
  }

  async function handleOpenInvite() {
    if (loadingInvite) return;
    setShowMenu(false);
    setLoadingInvite(true);
    setError("");
    try {
      const res = await fetch(`/api/communities/${slug}/invites`);
      const data = (await res.json().catch(() => null)) as { url?: string | null; error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? "Erro ao buscar convite");
      setInviteLink(data?.url ?? null);
      setShowInviteModal(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao buscar convite");
    } finally {
      setLoadingInvite(false);
    }
  }

  async function handleGenerateInvite() {
    if (generatingInvite) return;
    setShowMenu(false);
    setGeneratingInvite(true);
    setError("");
    try {
      const res = await fetch(`/api/communities/${slug}/invites`, { method: "POST" });
      const data = (await res.json()) as { token?: string; url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Erro ao gerar convite");
      setInviteLink(data.url);
      setShowInviteModal(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao gerar convite");
    } finally {
      setGeneratingInvite(false);
    }
  }

  async function handleCopyInvite() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function openDeleteModal() {
    setError("");
    setShowMenu(false);
    setShowDeleteModal(true);
  }

  function closeDeleteModal() {
    if (deleting) return;
    setShowDeleteModal(false);
    setError("");
  }

  function toggleMenu() {
    setShowMenu((prev) => !prev);
  }

  async function handleSaveCommunity() {
    if (!canSave || saving) return;

    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/communities/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          description: description.slice(0, 500),
          rules: rules.slice(0, 2000),
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Erro ao atualizar comunidade");
        return;
      }

      setShowEditModal(false);
      router.refresh();
    } catch {
      setError("Erro de conexao.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setShowMenu(false);
    setUploadingCover(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await fetch("/api/upload/community-cover", {
        method: "POST",
        body: formData,
      });
      const uploadData = (await uploadResponse.json().catch(() => null)) as { error?: string; url?: string } | null;

      if (!uploadResponse.ok || !uploadData?.url) {
        setError(uploadData?.error ?? "Erro ao enviar capa");
        return;
      }

      const patchResponse = await fetch(`/api/communities/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverImageUrl: uploadData.url }),
      });

      if (!patchResponse.ok) {
        const patchData = (await patchResponse.json().catch(() => null)) as { error?: string } | null;
        setError(patchData?.error ?? "Erro ao atualizar capa");
        return;
      }

      router.refresh();
    } catch {
      setError("Erro de conexao.");
    } finally {
      setUploadingCover(false);
      e.target.value = "";
    }
  }

  async function handleDeleteCommunity() {
    if (deleting) return;

    setDeleting(true);
    setError("");

    try {
      const response = await fetch(`/api/communities/${slug}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Erro ao excluir comunidade");
        return;
      }

      setShowDeleteModal(false);
      router.push("/comunidades");
      router.refresh();
    } catch {
      setError("Erro de conexao.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div ref={menuRef} className="relative">
        <button
          ref={buttonRef}
          type="button"
          onClick={toggleMenu}
          className="flex h-10 w-10 items-center justify-center rounded-full border transition-opacity hover:opacity-80"
          style={{
            borderColor: "var(--color-border)",
            background: "var(--color-card, var(--color-surface))",
            color: "var(--color-text-muted)",
          }}
          aria-label="Ações da comunidade"
          title="ações da comunidade"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="5" r="1.8" fill="currentColor" />
            <circle cx="12" cy="12" r="1.8" fill="currentColor" />
            <circle cx="12" cy="19" r="1.8" fill="currentColor" />
          </svg>
        </button>

        {showMenu && (
          <div
            ref={menuRef}
            className="absolute right-0 top-full z-[60] mt-2 min-w-[188px] rounded-xl border py-1 shadow-lg"
            style={{
              background: "var(--color-card, var(--color-surface))",
              borderColor: "var(--color-border)",
            }}
          >
            {canManage && (
              <>
                <button
                  type="button"
                  onClick={openEditModal}
                  className="block w-full border-0 bg-transparent px-4 py-2 text-left text-sm font-semibold hover:opacity-80"
                  style={{ color: "var(--color-text)" }}
                >
                  Editar comunidade
                </button>
                <label
                  className={`relative block w-full cursor-pointer px-4 py-2 text-left text-sm font-semibold hover:opacity-80 ${uploadingCover ? "pointer-events-none opacity-60" : ""}`}
                  style={{ color: "var(--color-text)" }}
                >
                  {uploadingCover ? "Enviando capa..." : "Alterar capa"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={handleCoverChange}
                  />
                </label>
                {canInvite && (
                  <button
                    type="button"
                    onClick={() => void handleOpenInvite()}
                    disabled={loadingInvite}
                    className="block w-full border-0 bg-transparent px-4 py-2 text-left text-sm font-semibold hover:opacity-80 disabled:opacity-50"
                    style={{ color: "var(--color-text)" }}
                  >
                    {loadingInvite ? "Buscando convite..." : "Link de convite"}
                  </button>
                )}
              </>
            )}
            <button
              type="button"
              onClick={openDeleteModal}
              className="block w-full border-0 bg-transparent px-4 py-2 text-left text-sm font-semibold hover:opacity-80"
              style={{ color: "#b91c1c" }}
            >
              Excluir comunidade
            </button>
          </div>
        )}
      </div>

      {showInviteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowInviteModal(false)}
        >
          <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="m-0 mb-4 text-lg font-black" style={{ color: "var(--color-text)" }}>
              Link de convite
            </h3>
            <p className="mb-3 text-sm" style={{ color: "var(--color-text-muted)" }}>
              Compartilhe este link para convidar pessoas para a comunidade.
            </p>
            {inviteLink ? (
              <div
                className="mb-4 break-all rounded-lg px-3 py-2 text-sm font-mono"
                style={{ background: "var(--color-surface)", color: "var(--color-text)", border: "1px solid var(--color-border)" }}
              >
                {inviteLink}
              </div>
            ) : (
              <p
                className="mb-4 rounded-lg px-3 py-2 text-sm"
                style={{ background: "var(--color-surface)", color: "var(--color-text-muted)", border: "1px solid var(--color-border)" }}
              >
                Nenhum link ativo ainda.
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowInviteModal(false)} className="btn-secondary text-sm">
                Fechar
              </button>
              <button type="button" onClick={() => void handleGenerateInvite()} disabled={generatingInvite} className="btn-secondary text-sm">
                {generatingInvite ? "Gerando..." : inviteLink ? "Gerar novo" : "Gerar link"}
              </button>
              <button type="button" onClick={() => void handleCopyInvite()} disabled={!inviteLink} className="btn-primary text-sm">
                {copied ? "Copiado!" : "Copiar link"}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && !showEditModal && !showDeleteModal && (
        <p className="max-w-52 text-right text-xs" style={{ color: "#b91c1c" }}>
          {error}
        </p>
      )}

      {showEditModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-community-title"
          onClick={closeEditModal}
        >
          <div className="card w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col gap-3">
              <h3 id="edit-community-title" className="m-0 text-xl font-black" style={{ color: "var(--color-text)" }}>
                Editar comunidade
              </h3>
            </div>

            <div className="mt-5 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
                  Nome
                </label>
                <input
                  type="text"
                  className="input-base"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  minLength={3}
                  maxLength={80}
                />
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {name.length}/80
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
                  Descrição
                </label>
                <textarea
                  className="input-base min-h-[110px] resize-none"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                />
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {description.length}/500
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
                  Regras
                </label>
                <textarea
                  className="input-base min-h-[160px] resize-none"
                  value={rules}
                  onChange={(e) => setRules(e.target.value)}
                  maxLength={2000}
                />
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {rules.length}/2000
                </span>
              </div>
            </div>

            {error && (
              <p className="mb-0 mt-4 text-sm font-bold" style={{ color: "#b91c1c" }}>
                {error}
              </p>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={closeEditModal} className="btn-secondary" disabled={saving}>
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveCommunity}
                disabled={saving || !canSave}
                className="btn-primary"
              >
                {saving ? "salvando..." : "salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-community-title"
          onClick={closeDeleteModal}
        >
          <div className="card w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col gap-3">
              <h3 id="delete-community-title" className="m-0 text-xl font-black" style={{ color: "var(--color-text)" }}>
                Excluir comunidade
              </h3>
              <p className="m-0 text-sm leading-6" style={{ color: "var(--color-text-muted)" }}>
                Posts e comentários dessa comunidade também serão removidos.
              </p>
            </div>

            {error && (
              <p className="mb-0 mt-4 text-sm font-bold" style={{ color: "#b91c1c" }}>
                {error}
              </p>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={closeDeleteModal} className="btn-secondary" disabled={deleting}>
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteCommunity()}
                disabled={deleting}
                className="rounded-[10px] px-4 py-2 text-sm font-black transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
                style={{ background: "#dc2626", color: "#fff", border: "none", cursor: "pointer" }}
              >
                {deleting ? "excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
