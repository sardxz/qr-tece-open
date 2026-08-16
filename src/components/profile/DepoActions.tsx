"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  depoId: string;
  showApprove?: boolean;
};

export default function DepoActions({ depoId, showApprove = true }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleAction(action: "approve" | "reject" | "delete") {
    setLoading(true);
    try {
      if (action === "delete") {
        await fetch(`/api/depos/${depoId}`, { method: "DELETE" });
      } else {
        await fetch(`/api/depos/${depoId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2 mt-2.5">
      {showApprove && (
        <>
          <button
            onClick={() => handleAction("approve")}
            disabled={loading}
            className="text-xs px-2.5 py-1 rounded-full font-medium transition-colors"
            style={{
              background: "var(--color-tece-500)",
              color: "white",
            }}
          >
            aprovar
          </button>
          <button
            onClick={() => handleAction("reject")}
            disabled={loading}
            className="text-xs px-2.5 py-1 rounded-full font-medium transition-colors"
            style={{
              background: "transparent",
              color: "var(--color-text-muted)",
              border: "1px solid var(--color-border)",
            }}
          >
            recusar
          </button>
        </>
      )}
      <button
        onClick={() => handleAction("delete")}
        disabled={loading}
        className="text-xs px-2.5 py-1 rounded-full font-medium ml-auto transition-colors"
        style={{
          background: "transparent",
          color: "#b91c1c",
          border: "1px solid #fecaca",
        }}
      >
        remover
      </button>
    </div>
  );
}
