"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type Props = {
  isAdmin: boolean;
  embedded?: boolean;
};

export default function SessionActionsCard({ isAdmin, embedded = false }: Props) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className={embedded ? "flex flex-col gap-4" : "session-actions-card card p-6 flex flex-col gap-4"}>
      <h2 className="text-base font-black m-0" style={{ color: "var(--color-text)" }}>
        sessão
      </h2>
      <div className="flex flex-col gap-3">
        {isAdmin && (
          <Link
            href="/admin"
            className="text-sm font-black no-underline rounded-lg px-3 py-2 w-fit"
            style={{ background: "rgba(245,158,11,.15)", color: "#f59e0b" }}
          >
            painel admin
          </Link>
        )}
        <Link
          href="/home"
          className="text-sm font-black no-underline"
          style={{ color: "var(--color-tece-500)" }}
        >
          ajuda
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="text-sm font-black text-left border-0 bg-transparent p-0 cursor-pointer w-fit"
          style={{ color: "#ef4444" }}
        >
          sair da conta
        </button>
      </div>
    </div>
  );
}
