"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteAccountCard({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const canDelete = confirmation.trim().toUpperCase() === "EXCLUIR";

  function openModal() {
    setError("");
    setConfirmation("");
    setIsOpen(true);
  }

  function closeModal() {
    if (loading) return;
    setIsOpen(false);
    setConfirmation("");
    setError("");
  }

  async function handleDelete() {
    if (!canDelete) {
      setError("Digite EXCLUIR para confirmar.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/users/me", { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Não foi possível excluir sua conta.");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className={embedded ? "flex flex-col gap-5" : "card flex flex-col gap-5 p-6"}>
        <div className="flex flex-col gap-2">
          <h2 className="m-0 text-base font-black" style={{ color: "var(--color-text)" }}>
            excluir minha conta
          </h2>
          <p className="m-0 text-sm leading-6" style={{ color: "var(--color-text-muted)" }}>
            Essa ação encerra sua conta e remove o acesso atual. Ela não pode ser desfeita.
          </p>
        </div>

        <div
          className="rounded-xl border px-4 py-3 text-sm leading-6"
          style={{ borderColor: "#fecaca", background: "#fef2f2", color: "#991b1b" }}
        >
          Revise essa decisão com calma antes de continuar.
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={openModal}
            className="rounded-[10px] px-4 py-2 text-sm font-black transition-opacity"
            style={{ background: "#dc2626", color: "#fff", border: "none", cursor: "pointer" }}
          >
            excluir conta
          </button>
        </div>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
        >
          <div className="card w-full max-w-md p-6">
            <div className="flex flex-col gap-3">
              <h3 id="delete-account-title" className="m-0 text-xl font-black" style={{ color: "var(--color-text)" }}>
                confirmar exclusao da conta
                
              </h3>
              <p className="m-0 text-sm leading-6" style={{ color: "var(--color-text-muted)" }}>
                Para confirmar, digite <strong>EXCLUIR</strong> no campo abaixo. Ao continuar, sua conta será encerrada.
              </p>
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <label className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
                confirmação
              </label>
              <input
                type="text"
                className="input-base"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder="Digite EXCLUIR"
                autoFocus
              />
            </div>

            {error && (
              <p className="mb-0 mt-4 text-sm font-bold" style={{ color: "#b91c1c" }}>
                {error}
              </p>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={closeModal} className="btn-secondary" disabled={loading}>
                cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading || !confirmation.trim()}
                className="rounded-[10px] px-4 py-2 text-sm font-black transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
                style={{ background: "#dc2626", color: "#fff", border: "none", cursor: "pointer" }}
              >
                {loading ? "excluindo..." : "confirmar exclusão"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
